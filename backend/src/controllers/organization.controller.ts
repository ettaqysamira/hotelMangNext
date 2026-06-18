import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import { OrganizationStatus, SubscriptionPlan } from '@prisma/client';

export const createOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, logo, plan } = req.body;

    // Check if user is SUPER_ADMIN or if creating their first organization
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.organizationId) {
      res.status(403).json({
        status: 'error',
        message: 'You already belong to an organization'
      });
      return;
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existingOrg) {
      res.status(400).json({
        status: 'error',
        message: 'Organization slug already exists'
      });
      return;
    }

    // Create organization with default subscription
    const organization = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name,
          slug,
          logo,
          plan: plan || SubscriptionPlan.FREE,
          status: OrganizationStatus.ACTIVE
        }
      });

      // Create trial subscription
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial

      await tx.subscription.create({
        data: {
          organizationId: newOrg.id,
          plan: plan || SubscriptionPlan.FREE,
          status: 'TRIAL',
          startDate: new Date(),
          endDate: trialEndDate
        }
      });

      // Update user with organizationId if not SUPER_ADMIN
      if (req.user!.role !== 'SUPER_ADMIN') {
        await tx.user.update({
          where: { id: req.user!.id },
          data: { organizationId: newOrg.id }
        });
      }

      return newOrg;
    });

    res.status(201).json({
      status: 'success',
      data: { organization }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only SUPER_ADMIN can see all organizations
    if (req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
      return;
    }

    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            hostels: true,
            users: true
          }
        },
        subscription: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: organizations.length,
      data: { organizations }
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        hostels: {
          include: {
            rooms: true,
            _count: {
              select: {
                rooms: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true
          }
        },
        subscription: true
      }
    });

    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
      return;
    }

    // Check access: SUPER_ADMIN or member of the organization
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.organizationId !== organization.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { organization }
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, logo, status } = req.body;

    const organization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
      return;
    }

    // Check access: SUPER_ADMIN or manager of the organization
    if (req.user!.role !== 'SUPER_ADMIN' && req.user!.organizationId !== organization.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
      return;
    }

    // Only SUPER_ADMIN can change status
    if (status && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        status: 'error',
        message: 'Only super admin can change organization status'
      });
      return;
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(logo && { logo }),
        ...(status && { status })
      }
    });

    res.status(200).json({
      status: 'success',
      data: { organization: updatedOrganization }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Only SUPER_ADMIN can delete organizations
    if (req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id }
    });

    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
      return;
    }

    // Delete organization (cascade will handle related records)
    await prisma.organization.delete({
      where: { id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMyOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user!.organizationId) {
      res.status(404).json({
        status: 'error',
        message: 'You do not belong to any organization'
      });
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.user!.organizationId },
      include: {
        hostels: {
          include: {
            _count: {
              select: {
                rooms: true
              }
            }
          }
        },
        subscription: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { organization }
    });
  } catch (error) {
    next(error);
  }
};
