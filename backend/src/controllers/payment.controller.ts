import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';
import { PaymentStatus, BookingStatus, PaymentMethod } from '@prisma/client';
import QRCode from 'qrcode';
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_CURRENCY = process.env.RAZORPAY_CURRENCY || 'INR';

const isRazorpayConfigured = () => Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

const normalizePaymentMethod = (method?: string): PaymentMethod => {
  if (method === PaymentMethod.CASH || method === PaymentMethod.CARD || method === PaymentMethod.BANK_TRANSFER) {
    return method;
  }

  return PaymentMethod.CARD;
};

const toCurrencySubunits = (amount: unknown): number => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid payment amount.');
  }

  return Math.round(numericAmount * 100);
};

const buildCheckoutUrl = (params: Record<string, string | number | undefined | null>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return `/checkout/pay?${searchParams.toString()}`;
};

async function createRazorpayOrder(payment: any) {
  const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: toCurrencySubunits(payment.amount),
      currency: RAZORPAY_CURRENCY,
      receipt: payment.invoiceNumber.slice(0, 40),
      notes: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        hostel: payment.booking.room.hostel.name
      }
    })
  });

  const data = await response.json() as any;

  if (!response.ok) {
    const message = data?.error?.description || 'Razorpay order creation failed.';
    throw new Error(message);
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { transactionRef: data.id }
  });

  return data;
}

async function markPaymentAsPaid(payment: any, paymentMethod: PaymentMethod = PaymentMethod.CARD, transactionRef?: string) {
  const qrCodeDataUrl = await QRCode.toDataURL(payment.bookingId);

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paymentDate: new Date(),
        paymentMethod,
        transactionRef: transactionRef || payment.transactionRef || `TXN-${Date.now()}`
      }
    });

    const updatedBooking = await tx.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        qrCodeUrl: qrCodeDataUrl
      }
    });

    await tx.auditLog.create({
      data: {
        userId: payment.booking.guest.userId,
        action: 'PAYMENT_SUCCESS',
        entity: 'Payment',
        entityId: payment.id,
        details: {
          amount: Number(payment.amount),
          invoiceNumber: payment.invoiceNumber,
          transactionRef: transactionRef || payment.transactionRef
        }
      }
    });

    return { updatedPayment, updatedBooking, qrCodeDataUrl };
  });

  return result;
}

function triggerBookingConfirmationWorkflow(payment: any, qrCodeDataUrl: string) {
  if (!process.env.N8N_WEBHOOK_URL) return;

  try {
    fetch(`${process.env.N8N_WEBHOOK_URL}/webhooks/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'BOOKING_CONFIRMED',
        bookingId: payment.bookingId,
        guestEmail: payment.booking.guest.user.email,
        guestName: `${payment.booking.guest.user.firstName} ${payment.booking.guest.user.lastName}`,
        totalPrice: payment.booking.totalPrice,
        qrCodeDataUrl,
        invoiceNumber: payment.invoiceNumber,
        roomNumber: payment.booking.room.roomNumber,
        hostelName: payment.booking.room.hostel.name
      })
    }).catch(err => console.log('n8n Webhook Error (Silent):', err.message));
  } catch (e) {}
}

export const createCheckoutSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = req.body;

    const payment = await prisma.payment.findFirst({
      where: {
        bookingId,
        status: PaymentStatus.UNPAID
      },
      include: {
        booking: {
          include: {
            room: { include: { hostel: true } }
          }
        }
      }
    });

    if (!payment) {
      res.status(404).json({
        status: 'error',
        message: 'Aucune facture impayee trouvee pour cette reservation.'
      });
      return;
    }

    let razorpayOrder: any = null;
    let gateway: 'razorpay' | 'demo' = 'demo';

    if (isRazorpayConfigured()) {
      razorpayOrder = await createRazorpayOrder(payment);
      gateway = 'razorpay';
    }

    const checkoutUrl = buildCheckoutUrl({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amount: Number(payment.amount),
      invoiceNumber: payment.invoiceNumber,
      hostelName: payment.booking.room.hostel.name,
      gateway,
      currency: razorpayOrder?.currency || RAZORPAY_CURRENCY,
      razorpayOrderId: razorpayOrder?.id,
      razorpayKeyId: gateway === 'razorpay' ? RAZORPAY_KEY_ID : undefined,
      razorpayAmount: razorpayOrder?.amount
    });

    res.status(200).json({
      status: 'success',
      checkoutUrl,
      gateway,
      paymentId: payment.id,
      razorpay: razorpayOrder ? {
        keyId: RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      } : null
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      paymentId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    } = req.body;

    if (!isRazorpayConfigured()) {
      res.status(400).json({
        status: 'error',
        message: 'Razorpay is not configured on this server.'
      });
      return;
    }

    if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      res.status(400).json({
        status: 'error',
        message: 'Missing Razorpay verification fields.'
      });
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            guest: { include: { user: true } },
            room: { include: { hostel: true } }
          }
        }
      }
    });

    if (!payment) {
      res.status(404).json({ status: 'error', message: 'Payment record not found.' });
      return;
    }

    if (payment.status === PaymentStatus.PAID) {
      res.status(200).json({
        status: 'success',
        message: 'Payment already processed.',
        data: { payment }
      });
      return;
    }

    const expectedOrderId = payment.transactionRef || razorpayOrderId;

    if (expectedOrderId !== razorpayOrderId) {
      res.status(400).json({ status: 'error', message: 'Razorpay order mismatch.' });
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      res.status(400).json({ status: 'error', message: 'Invalid Razorpay signature.' });
      return;
    }

    const result = await markPaymentAsPaid(payment, PaymentMethod.CARD, razorpayPaymentId);
    triggerBookingConfirmationWorkflow(payment, result.qrCodeDataUrl);

    res.status(200).json({
      status: 'success',
      message: 'Paiement Razorpay verifie avec succes.',
      data: {
        updatedPayment: result.updatedPayment,
        updatedBooking: result.updatedBooking
      }
    });
  } catch (error) {
    next(error);
  }
};

// Webhook simulation used by demo mode when Razorpay keys are absent.
export const simulatePaymentWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentId, status, transactionRef, paymentMethod } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            guest: { include: { user: true } },
            room: { include: { hostel: true } }
          }
        }
      }
    });

    if (!payment) {
      res.status(404).json({ status: 'error', message: 'Enregistrement de paiement non trouve.' });
      return;
    }

    if (payment.status === PaymentStatus.PAID) {
      res.status(400).json({ status: 'error', message: 'Ce paiement a deja ete traite.' });
      return;
    }

    if (status === 'SUCCESS') {
      const result = await markPaymentAsPaid(payment, normalizePaymentMethod(paymentMethod), transactionRef || `TXN-${Date.now()}`);
      triggerBookingConfirmationWorkflow(payment, result.qrCodeDataUrl);

      res.status(200).json({
        status: 'success',
        message: 'Paiement traite avec succes.',
        data: {
          updatedPayment: result.updatedPayment,
          updatedBooking: result.updatedBooking
        }
      });
      return;
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED }
    });

    res.status(200).json({
      status: 'success',
      message: 'Le paiement a echoue ou a ete abandonne.'
    });
  } catch (error) {
    next(error);
  }
};

export const getOverduePayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const overduePayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.UNPAID,
        dueDate: { lt: new Date() }
      },
      include: {
        booking: {
          include: {
            guest: { include: { user: true } },
            room: { include: { hostel: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.status(200).json({
      status: 'success',
      results: overduePayments.length,
      data: { overduePayments }
    });
  } catch (error) {
    next(error);
  }
};
