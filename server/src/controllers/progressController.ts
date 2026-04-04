import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const skipTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { taskIds } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      res.status(400).json({ error: 'Valid taskIds array is required' });
      return;
    }

    // 1. Delete the tasks from DB
    await prisma.task.deleteMany({
      where: {
        id: { in: taskIds },
        userId: userId,
      },
    });

    // 2. Increment failedTasks for yesterday's progress
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0); // Normalize to date start

    const progress = await prisma.dailyProgress.upsert({
      where: {
        userId_date: {
          userId,
          date: yesterday,
        },
      },
      update: {
        failedTasks: { increment: taskIds.length },
      },
      create: {
        userId,
        date: yesterday,
        failedTasks: taskIds.length,
      },
    });

    res.json({ message: 'Tasks skipped and progress updated', progress });
  } catch (error) {
    next(error);
  }
};

export const getProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const progressRecords = await prisma.dailyProgress.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    });

    res.json({ progress: progressRecords });
  } catch (error) {
    next(error);
  }
};
