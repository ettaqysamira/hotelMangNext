import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import { ComplaintStatus, ComplaintCategory, ComplaintPriority, Role } from '@prisma/client';

export const createComplaint = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description } = req.body;

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Non autorisé.' });
      return;
    }

    const guestProfile = await prisma.guestProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!guestProfile) {
      res.status(403).json({
        status: 'error',
        message: 'Seuls les profils voyageurs peuvent déclarer des réclamations.'
      });
      return;
    }

    // Create complaint in DB
    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        guestId: guestProfile.id,
        status: ComplaintStatus.OPEN,
        category: ComplaintCategory.OTHER,
        priority: ComplaintPriority.MEDIUM
      },
      include: {
        guest: { include: { user: true } }
      }
    });

    // Trigger n8n Webhook
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        fetch(`${process.env.N8N_WEBHOOK_URL}/webhooks/complaints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            complaintId: complaint.id,
            title: complaint.title,
            description: complaint.description,
            guestEmail: complaint.guest.user.email,
            guestName: `${complaint.guest.user.firstName} ${complaint.guest.user.lastName}`
          })
        }).catch(err => console.log('n8n Webhook Error (Silent):', err.message));
      } catch (e) {}
    }

    res.status(201).json({
      status: 'success',
      data: { complaint }
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint called by n8n after processing Hugging Face Classification
export const autoAssignComplaint = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { category, priority } = req.body;

    // Find any available maintenance agent in the system
    const maintenanceAgent = await prisma.user.findFirst({
      where: {
        role: Role.MAINTENANCE,
        isActive: true
      }
    });

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        category: category as ComplaintCategory,
        priority: priority as ComplaintPriority,
        status: maintenanceAgent ? ComplaintStatus.ASSIGNED : ComplaintStatus.OPEN,
        assignedAgentId: maintenanceAgent ? maintenanceAgent.id : null
      },
      include: {
        assignedAgent: {
          select: { firstName: true, lastName: true, email: true }
        },
        guest: { include: { user: true } }
      }
    });

    // Optional: Log Audit
    await prisma.auditLog.create({
      data: {
        action: 'COMPLAINT_AUTO_ASSIGN',
        entity: 'Complaint',
        entityId: id,
        details: { category, priority, assignedTo: maintenanceAgent ? `${maintenanceAgent.firstName} ${maintenanceAgent.lastName}` : 'NONE' }
      }
    });

    res.status(200).json({
      status: 'success',
      data: { complaint: updatedComplaint }
    });
  } catch (error) {
    next(error);
  }
};

export const updateComplaintStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const complaint = await prisma.complaint.update({
      where: { id },
      data: { status: status as ComplaintStatus }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'COMPLAINT_STATUS_UPDATE',
        entity: 'Complaint',
        entityId: id,
        details: { status }
      }
    });

    res.status(200).json({
      status: 'success',
      data: { complaint }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyComplaints = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Non autorisé.' });
      return;
    }

    const guestProfile = await prisma.guestProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!guestProfile) {
      res.status(404).json({ status: 'error', message: 'Profil voyageur non trouvé.' });
      return;
    }

    const complaints = await prisma.complaint.findMany({
      where: { guestId: guestProfile.id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: complaints.length,
      data: { complaints }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllComplaints = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // If agent is logged in, show only assigned tickets
    const whereClause: any = {};
    if (req.user?.role === Role.MAINTENANCE) {
      whereClause.assignedAgentId = req.user.id;
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      include: {
        guest: { include: { user: true } },
        assignedAgent: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: complaints.length,
      data: { complaints }
    });
  } catch (error) {
    next(error);
  }
};
