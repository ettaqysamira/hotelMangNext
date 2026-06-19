import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import { BookingStatus, PaymentStatus, BedStatus } from '@prisma/client';
import QRCode from 'qrcode';

export const createBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, checkIn, checkOut } = req.body;

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Non autorisé.' });
      return;
    }

    // Get Guest Profile
    const guestProfile = await prisma.guestProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!guestProfile) {
      res.status(403).json({
        status: 'error',
        message: 'Seuls les profils voyageurs peuvent effectuer des réservations.'
      });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      res.status(400).json({
        status: 'error',
        message: 'La date de départ doit être supérieure à la date d\'arrivée.'
      });
      return;
    }

    // Fetch Room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { beds: true, hostel: true }
    });

    if (!room) {
      res.status(404).json({ status: 'error', message: 'Chambre non trouvée.' });
      return;
    }

    // Calculate Price
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalPrice = Number(room.pricePerNight) * diffDays;

    // Check Bed Availability (Double Booking Prevention)
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        roomId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        OR: [
          { checkInDate: { lt: checkOutDate }, checkOutDate: { gt: checkInDate } }
        ]
      },
      select: { bedId: true }
    });

    const bookedBedIds = new Set(overlappingBookings.map(b => b.bedId).filter(Boolean));

    // Find first available bed
    const availableBed = room.beds.find(bed => 
      bed.status === BedStatus.AVAILABLE && !bookedBedIds.has(bed.id)
    );

    if (!availableBed) {
      res.status(400).json({
        status: 'error',
        message: 'Plus aucun lit n\'est disponible dans cette chambre pour les dates sélectionnées.'
      });
      return;
    }

    // Create Booking
    const booking = await prisma.booking.create({
      data: {
        guestId: guestProfile.id,
        roomId,
        bedId: availableBed.id,
        checkInDate,
        checkOutDate,
        totalPrice,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID
      },
      include: {
        room: {
          include: { hostel: true }
        },
        bed: true
      }
    });

    // Create associated unpaid Payment Invoice record
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: totalPrice,
        dueDate: checkInDate,
        invoiceNumber,
        status: PaymentStatus.UNPAID
      }
    });

    // Trigger n8n Webhook (Asynchronously)
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        fetch(`${process.env.N8N_WEBHOOK_URL}/webhooks/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'BOOKING_CREATED',
            bookingId: booking.id,
            guestEmail: req.user.email,
            guestName: `${req.user.firstName} ${req.user.lastName}`,
            totalPrice,
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            roomNumber: room.roomNumber,
            hostelName: room.hostel.name
          })
        }).catch(err => console.log('n8n Webhook Error (Silent):', err.message));
      } catch (e) {
        // Silent error to prevent booking failure if n8n is offline
      }
    }

    res.status(201).json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

export const confirmBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: { include: { user: true } },
        room: { include: { hostel: true } }
      }
    });

    if (!booking) {
      res.status(404).json({ status: 'error', message: 'Réservation non trouvée.' });
      return;
    }

    // Generate QR Code containing the booking ID
    const qrCodeDataUrl = await QRCode.toDataURL(booking.id);

    // Update Booking status and store QR Code
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CONFIRMED,
        qrCodeUrl: qrCodeDataUrl
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'BOOKING_CONFIRM',
        entity: 'Booking',
        entityId: booking.id,
        details: { guestId: booking.guestId, qrGenerated: true }
      }
    });

    // Trigger n8n Webhook for confirmed status (handles sending email with PDF and QR Code)
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        fetch(`${process.env.N8N_WEBHOOK_URL}/webhooks/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'BOOKING_CONFIRMED',
            bookingId: booking.id,
            guestEmail: booking.guest.user.email,
            guestName: `${booking.guest.user.firstName} ${booking.guest.user.lastName}`,
            totalPrice: booking.totalPrice,
            qrCodeDataUrl,
            roomNumber: booking.room.roomNumber,
            hostelName: booking.room.hostel.name
          })
        }).catch(err => console.log('n8n Webhook Error (Silent):', err.message));
      } catch (e) {}
    }

    res.status(200).json({
      status: 'success',
      data: { booking: updatedBooking }
    });
  } catch (error) {
    next(error);
  }
};

export const checkInBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: { include: { user: true } },
        bed: true
      }
    });

    if (!booking) {
      res.status(404).json({ status: 'error', message: 'Réservation non trouvée.' });
      return;
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      res.status(400).json({
        status: 'error',
        message: `La réservation ne peut pas être enregistrée (Statut actuel: ${booking.status}). Le paiement doit être effectué.`
      });
      return;
    }

    // Transaction to update booking status, guest profile status, and bed status
    await prisma.$transaction(async (tx) => {
      // 1. Update Booking Status
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED } // Mark completed/checked-in
      });

      // 2. Set Guest Profile Status to Active
      await tx.guestProfile.update({
        where: { id: booking.guestId },
        data: { status: 'CHECKED_IN' }
      });

      // 3. Mark Bed status as OCCUPIED
      if (booking.bedId) {
        await tx.bed.update({
          where: { id: booking.bedId },
          data: { status: BedStatus.OCCUPIED }
        });
      }

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'CHECK_IN',
          entity: 'Booking',
          entityId: bookingId,
          details: { guestName: `${booking.guest.user.firstName} ${booking.guest.user.lastName}`, bedNumber: booking.bed?.bedNumber }
        }
      });
    });

    res.status(200).json({
      status: 'success',
      message: `Enregistrement (Check-in) réussi pour ${booking.guest.user.firstName} ${booking.guest.user.lastName}.`
    });
  } catch (error) {
    next(error);
  }
};

export const createExternalBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hostelName, hostelCity, hostelAddress, roomNumber, roomType, pricePerNight, checkIn, checkOut } = req.body;

    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Non autorisé.' });
      return;
    }

    const guestProfile = await prisma.guestProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!guestProfile) {
      res.status(403).json({ status: 'error', message: 'Seuls les profils voyageurs peuvent effectuer des réservations.' });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      res.status(400).json({ status: 'error', message: 'La date de départ doit être supérieure à la date d\'arrivée.' });
      return;
    }

    const diffDays = Math.max(1, Math.ceil(Math.abs(checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalPrice = Number(pricePerNight) * diffDays;

    const result = await prisma.$transaction(async (tx) => {
      let hostel = await tx.hostel.findFirst({
        where: { name: hostelName, city: hostelCity }
      });
      if (!hostel) {
        hostel = await tx.hostel.create({
          data: { name: hostelName, city: hostelCity, address: hostelAddress || '' }
        });
      }

      const room = await tx.room.create({
        data: {
          roomNumber: roomNumber || 'EXT-1',
          floor: 1,
          type: roomType || 'DORM_MIXED',
          pricePerNight,
          amenities: [],
          hostelId: hostel.id
        }
      });

      const bed = await tx.bed.create({
        data: { bedNumber: '1', status: BedStatus.AVAILABLE, roomId: room.id }
      });

      const booking = await tx.booking.create({
        data: {
          guestId: guestProfile.id,
          roomId: room.id,
          bedId: bed.id,
          checkInDate,
          checkOutDate,
          totalPrice,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID
        },
        include: { room: { include: { hostel: true } }, bed: true }
      });

      const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalPrice,
          dueDate: checkInDate,
          invoiceNumber,
          status: PaymentStatus.UNPAID
        }
      });

      return { booking, payment };
    });

    res.status(201).json({
      status: 'success',
      data: {
        booking: result.booking,
        paymentId: result.payment.id,
        invoiceNumber: result.payment.invoiceNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

    const bookings = await prisma.booking.findMany({
      where: { guestId: guestProfile.id },
      include: {
        room: { include: { hostel: true } },
        bed: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } }
        },
        room: {
          include: {
            hostel: { include: { managers: { select: { id: true, firstName: true, lastName: true, email: true } } } },
            beds: true
          }
        },
        bed: true,
        payments: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!booking) {
      res.status(404).json({ status: 'error', message: 'Réservation non trouvée.' });
      return;
    }

    if (!['SUPER_ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT'].includes(req.user!.role)) {
      const guestProfile = await prisma.guestProfile.findUnique({ where: { userId: req.user!.id } });
      if (!guestProfile || booking.guestId !== guestProfile.id) {
        res.status(403).json({ status: 'error', message: 'Accès non autorisé à cette réservation.' });
        return;
      }
    }

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        guest: { include: { user: true } },
        room: { include: { hostel: true } },
        bed: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: { bookings }
    });
  } catch (error) {
    next(error);
  }
};
