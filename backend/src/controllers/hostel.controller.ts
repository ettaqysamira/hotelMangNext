import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const createHostel = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, address, city, phone, email, description } = req.body;

    const hostel = await prisma.hostel.create({
      data: {
        name,
        address,
        city,
        phone,
        email,
        description
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'HOSTEL_CREATE',
        entity: 'Hostel',
        entityId: hostel.id,
        details: { name: hostel.name }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { hostel }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllHostels = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { city } = req.query;

    const hostels = await prisma.hostel.findMany({
      where: city ? { city: String(city) } : {},
      include: {
        _count: {
          select: { rooms: true }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: hostels.length,
      data: { hostels }
    });
  } catch (error) {
    next(error);
  }
};

export const getHostelById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const hostel = await prisma.hostel.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            beds: true
          }
        }
      }
    });

    if (!hostel) {
      res.status(404).json({
        status: 'error',
        message: 'Auberge de jeunesse non trouvée.'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { hostel }
    });
  } catch (error) {
    next(error);
  }
};

export const updateHostel = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, address, city, phone, email, description } = req.body;

    const hostel = await prisma.hostel.update({
      where: { id },
      data: {
        name,
        address,
        city,
        phone,
        email,
        description
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'HOSTEL_UPDATE',
        entity: 'Hostel',
        entityId: hostel.id,
        details: { name: hostel.name }
      }
    });

    res.status(200).json({
      status: 'success',
      data: { hostel }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHostel = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.hostel.delete({
      where: { id }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'HOSTEL_DELETE',
        entity: 'Hostel',
        entityId: id
      }
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
