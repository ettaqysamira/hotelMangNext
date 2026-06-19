import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables before Prisma client initialization.
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL. Create backend/.env and set DATABASE_URL to your MySQL connection string.');
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
