import { Router } from 'express';
import { createBooking, confirmBooking, checkInBooking, getMyBookings, getAllBookings, getBookingById } from '../controllers/booking.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(protect);

router.post('/', restrictTo(Role.GUEST), createBooking);
router.patch('/:id/confirm', restrictTo(Role.SUPER_ADMIN, Role.MANAGER), confirmBooking);
router.post('/check-in', restrictTo(Role.SUPER_ADMIN, Role.MANAGER, Role.RECEPTIONIST), checkInBooking);
router.get('/my-bookings', restrictTo(Role.GUEST), getMyBookings);
router.get('/:id', getBookingById);
router.get('/', restrictTo(Role.SUPER_ADMIN, Role.MANAGER, Role.RECEPTIONIST, Role.ACCOUNTANT), getAllBookings);

export default router;
