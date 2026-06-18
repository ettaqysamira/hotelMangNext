import { Router } from 'express';
import { createCheckoutSession, simulatePaymentWebhook, verifyRazorpayPayment, getOverduePayments } from '../controllers/payment.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public Webhook Simulation (called by Stripe/Razorpay or the client simulator)
router.post('/webhook', simulatePaymentWebhook);

// Protected Routes
router.use(protect);
router.post('/checkout-session', restrictTo(Role.GUEST), createCheckoutSession);
router.post('/verify-razorpay', restrictTo(Role.GUEST), verifyRazorpayPayment);
router.get('/overdue', restrictTo(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT), getOverduePayments);

export default router;
