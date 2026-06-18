import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/db';
import authRouter from './routes/auth.routes';
import hostelRouter from './routes/hostel.routes';
import roomRouter from './routes/room.routes';
import bookingRouter from './routes/booking.routes';
import paymentRouter from './routes/payment.routes';
import complaintRouter from './routes/complaint.routes';
import chatbotRouter from './routes/chatbot.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // In production, replace with specific origins
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/hostels', hostelRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/chatbot', chatbotRouter);

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Smart Hostel Management System API'
  });
});

// Prisma DB Connection Test Route
app.get('/api/test-db', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'success',
      message: 'Database connection established successfully!'
    });
  } catch (error) {
    next(error);
  }
});

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
