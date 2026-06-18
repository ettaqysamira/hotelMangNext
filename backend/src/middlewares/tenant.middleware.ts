import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

// Extend Request type to include organization
declare global {
  namespace Express {
    interface Request {
      organization?: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        status: string;
        maxHostels: number;
        maxRooms: number;
        maxBookings: number;
      };
    }
  }
}

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get tenant slug from header or subdomain
    const tenantSlug = req.headers['x-tenant-slug'] as string || 
                       (req.subdomains && req.subdomains[0]) || 
                       req.hostname?.split('.')[0];

    if (!tenantSlug) {
      res.status(400).json({
        status: 'error',
        message: 'Tenant slug is required'
      });
      return;
    }

    // Find organization by slug
    const organization = await prisma.organization.findUnique({
      where: { slug: tenantSlug }
    });

    if (!organization) {
      res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
      return;
    }

    // Check if organization is active
    if (organization.status !== 'ACTIVE') {
      res.status(403).json({
        status: 'error',
        message: 'Organization is not active'
      });
      return;
    }

    // Attach organization to request
    req.organization = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      status: organization.status,
      maxHostels: organization.maxHostels,
      maxRooms: organization.maxRooms,
      maxBookings: organization.maxBookings
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user belongs to the organization
export const checkOrganizationAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    const organization = req.organization;

    if (!user || !organization) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
      return;
    }

    // Check if user belongs to the organization or is super admin
    if (user.role !== 'SUPER_ADMIN' && user.organizationId !== organization.id) {
      res.status(403).json({
        status: 'error',
        message: 'You do not have access to this organization'
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check subscription limits
export const checkSubscriptionLimits = (resourceType: 'hostels' | 'rooms' | 'bookings') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organization = req.organization;

      if (!organization) {
        res.status(401).json({
          status: 'error',
          message: 'Organization not found'
        });
        return;
      }

      // Get current count based on resource type
      let currentCount = 0;
      let maxLimit = 0;

      switch (resourceType) {
        case 'hostels':
          currentCount = await prisma.hostel.count({
            where: { organizationId: organization.id }
          });
          maxLimit = organization.maxHostels;
          break;
        case 'rooms':
          currentCount = await prisma.room.count({
            where: {
              hostel: { organizationId: organization.id }
            }
          });
          maxLimit = organization.maxRooms;
          break;
        case 'bookings':
          currentCount = await prisma.booking.count({
            where: {
              room: { hostel: { organizationId: organization.id } }
            }
          });
          maxLimit = organization.maxBookings;
          break;
      }

      if (currentCount >= maxLimit) {
        res.status(403).json({
          status: 'error',
          message: `You have reached your ${resourceType} limit (${maxLimit}). Please upgrade your subscription.`
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
