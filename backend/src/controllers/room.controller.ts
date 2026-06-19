import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import { RoomType, BedStatus, BookingStatus } from '@prisma/client';
import { generateTextEmbedding, calculateCosineSimilarity } from '../services/huggingface.service';

const toAmenitiesList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
};

export const createRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hostelId, roomNumber, floor, type, pricePerNight, amenities, capacity } = req.body;

    // Verify hostel exists
    const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
    if (!hostel) {
      res.status(404).json({
        status: 'error',
        message: 'L\'auberge spécifiée n\'existe pas.'
      });
      return;
    }

    // Create room and generate beds in a transaction
    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          hostelId,
          roomNumber,
          floor: Number(floor),
          type: type as RoomType,
          pricePerNight: Number(pricePerNight),
          amenities: toAmenitiesList(amenities)
        }
      });

      // Generate individual beds according to capacity (for dorms or private beds)
      const bedCount = type === 'PRIVATE_ROOM' ? 1 : Number(capacity || 1);
      const bedsData = Array.from({ length: bedCount }).map((_, i) => ({
        roomId: newRoom.id,
        bedNumber: `Bed ${i + 1}`,
        status: BedStatus.AVAILABLE
      }));

      await tx.bed.createMany({
        data: bedsData
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ROOM_CREATE',
          entity: 'Room',
          entityId: newRoom.id,
          details: { roomNumber: newRoom.roomNumber, type: newRoom.type, beds: bedCount }
        }
      });

      return newRoom;
    });

    res.status(201).json({
      status: 'success',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRooms = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hostelId, type, priceMax, amenities, checkIn, checkOut, includeOccupancy } = req.query;
    const shouldIncludeOccupancy = String(includeOccupancy || '') === 'true';
    const occupancyDate = new Date();
    const amenitiesList = amenities
      ? String(amenities)
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];

    // Base conditions
    const where: any = {};
    if (hostelId) where.hostelId = String(hostelId);
    if (type) where.type = type as RoomType;
    if (priceMax) where.pricePerNight = { lte: Number(priceMax) };

    // Fetch rooms with beds
    let rooms = await prisma.room.findMany({
      where,
      include: {
        hostel: {
          select: { name: true, city: true }
        },
        beds: shouldIncludeOccupancy
          ? {
              include: {
                bookings: {
                  where: {
                    status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
                    checkOutDate: { gte: occupancyDate }
                  },
                  orderBy: { checkInDate: 'asc' },
                  take: 1,
                  include: {
                    guest: {
                      include: {
                        user: {
                          select: { firstName: true, lastName: true, email: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          : true
      }
    });

    // MySQL stores amenities as JSON; filter in memory for "contains all" behavior.
    if (amenitiesList.length > 0) {
      rooms = rooms.filter((room) => {
        const roomAmenities = toAmenitiesList(room.amenities);
        return amenitiesList.every((requiredAmenity) => roomAmenities.includes(requiredAmenity));
      });
    }

    if (shouldIncludeOccupancy) {
      rooms = rooms.map((room: any) => ({
        ...room,
        beds: room.beds.map((bed: any) => {
          const booking = bed.bookings?.[0];
          const occupancyStatus =
            bed.status === BedStatus.OCCUPIED || booking?.status === BookingStatus.COMPLETED
              ? 'OCCUPIED'
              : bed.status === BedStatus.RESERVED || booking
                ? 'RESERVED'
                : bed.status === BedStatus.MAINTENANCE || bed.status === BedStatus.CLEANING_REQUIRED
                  ? bed.status
                  : 'AVAILABLE';

          return {
            ...bed,
            occupancyStatus,
            activeBooking: booking
              ? {
                  id: booking.id,
                  status: booking.status,
                  checkInDate: booking.checkInDate,
                  checkOutDate: booking.checkOutDate,
                  guestName: `${booking.guest?.user?.firstName || ''} ${booking.guest?.user?.lastName || ''}`.trim()
                }
              : null,
            bookings: undefined
          };
        })
      }));
    }

    // If check-in and check-out are specified, filter out rooms that have NO available beds
    if (checkIn && checkOut) {
      const start = new Date(String(checkIn));
      const end = new Date(String(checkOut));

      // Get all bookings overlapping this period
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          status: { in: ['CONFIRMED', 'PENDING'] },
          OR: [
            { checkInDate: { lt: end }, checkOutDate: { gt: start } }
          ]
        },
        select: { bedId: true }
      });

      const bookedBedIds = new Set(overlappingBookings.map(b => b.bedId).filter(Boolean));

      // Filter rooms and mark available beds
      rooms = rooms.map(room => {
        const bedsWithAvailability = room.beds.map(bed => ({
          ...bed,
          isAvailable: !bookedBedIds.has(bed.id) && bed.status === BedStatus.AVAILABLE
        }));
        
        return {
          ...room,
          beds: bedsWithAvailability,
          availableBedsCount: bedsWithAvailability.filter(b => b.isAvailable).length
        };
      }).filter(room => room.type === 'PRIVATE_ROOM' ? room.beds.some(b => !bookedBedIds.has(b.id)) : room.availableBedsCount > 0);
    }

    res.status(200).json({
      status: 'success',
      results: rooms.length,
      data: { rooms }
    });
  } catch (error) {
    next(error);
  }
};

export const getRoomById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        hostel: true,
        beds: true
      }
    });

    if (!room) {
      res.status(404).json({
        status: 'error',
        message: 'Chambre non trouvée.'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { roomNumber, floor, type, pricePerNight, amenities } = req.body;

    const room = await prisma.room.update({
      where: { id },
      data: {
        roomNumber,
        floor: floor ? Number(floor) : undefined,
        type: type ? (type as RoomType) : undefined,
        pricePerNight: pricePerNight ? Number(pricePerNight) : undefined,
        amenities: amenities === undefined ? undefined : toAmenitiesList(amenities)
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'ROOM_UPDATE',
        entity: 'Room',
        entityId: room.id,
        details: { roomNumber: room.roomNumber }
      }
    });

    res.status(200).json({
      status: 'success',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.room.delete({
      where: { id }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'ROOM_DELETE',
        entity: 'Room',
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

export const recommendRooms = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { preferences } = req.body;

    if (!preferences) {
      res.status(400).json({ status: 'error', message: 'Les préférences du voyageur sont requises.' });
      return;
    }

    const rooms = await prisma.room.findMany({
      include: {
        hostel: true,
        beds: true
      }
    });

    if (rooms.length === 0) {
      res.status(200).json({ status: 'success', data: { recommendations: [] } });
      return;
    }

    const queryEmbedding = await generateTextEmbedding(preferences);

    const recommendations = await Promise.all(rooms.map(async (room) => {
      const amenitiesText = toAmenitiesList(room.amenities).join(', ');
      const roomDesc = `Room number ${room.roomNumber} is a ${room.type} located at ${room.hostel.name} in ${room.hostel.city}. Price is ${room.pricePerNight} EUR per night. Amenities: ${amenitiesText}.`;
      
      const roomEmbedding = await generateTextEmbedding(roomDesc);
      const similarity = calculateCosineSimilarity(queryEmbedding, roomEmbedding);
      
      return {
        room,
        similarity
      };
    }));

    recommendations.sort((a, b) => b.similarity - a.similarity);

    res.status(200).json({
      status: 'success',
      data: {
        recommendations: recommendations.slice(0, 3)
      }
    });
  } catch (error) {
    next(error);
  }
};
