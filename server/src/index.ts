import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import progressRoutes from './routes/progressRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5000;

// Middleware
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/tasks', taskRoutes);
app.use('/progress', progressRoutes);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Task Management System API is running');
});

// Error Handling Middleware (must be registered last)
app.use(errorHandler);

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
