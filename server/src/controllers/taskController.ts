import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const taskData = req.body;

    const task = await prisma.task.create({
      data: {
        ...taskData,
        userId,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    // Zod transforms these to numbers and provides defaults
    const { page, limit, status, search, date } = req.query as any;

    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {
      userId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (date) {
      // Create a Date range for the entire day (00:00:00 to 23:59:59)
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);
      whereClause.dueDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    res.json({
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const taskId = req.params.id as string;
    const updateData = req.body;

    // Check ownership
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.userId !== userId) {
      res
        .status(403)
        .json({ error: 'You are not authorized to update this task' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const toggleTaskStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const taskId = req.params.id as string;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.userId !== userId) {
      res
        .status(403)
        .json({ error: 'You are not authorized to update this task' });
      return;
    }

    // Toggle logic: If COMPLETED -> PENDING. Else -> COMPLETED.
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
    });

    // Handle Progress Record updating
    const progressDate = new Date();
    progressDate.setUTCHours(0,0,0,0);
    
    const incrementAmount = newStatus === 'COMPLETED' ? 1 : -1;
    await prisma.dailyProgress.upsert({
      where: { userId_date: { userId, date: progressDate } },
      update: { completedTasks: { increment: incrementAmount } },
      create: { userId, date: progressDate, completedTasks: newStatus === 'COMPLETED' ? 1 : 0 },
    });

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const taskId = req.params.id as string;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.userId !== userId) {
      res
        .status(403)
        .json({ error: 'You are not authorized to delete this task' });
      return;
    }

    await prisma.task.delete({ where: { id: taskId } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const cleanupTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Delete all completed tasks from before today
    await prisma.task.deleteMany({
      where: {
        userId,
        status: 'COMPLETED',
        dueDate: { lt: today }
      }
    });

    // 2. Identify incomplete tasks older than yesterday (2+ days old)
    const oldIncompleteTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        dueDate: { lt: yesterday }
      }
    });

    if (oldIncompleteTasks.length > 0) {
       for (const task of oldIncompleteTasks) {
         if (!task.dueDate) continue;
         const taskDate = new Date(task.dueDate);
         taskDate.setUTCHours(0, 0, 0, 0);

         await prisma.dailyProgress.upsert({
           where: { userId_date: { userId, date: taskDate } },
           update: { failedTasks: { increment: 1 } },
           create: { userId, date: taskDate, failedTasks: 1 },
         });
       }

       const taskIds = oldIncompleteTasks.map(t => t.id);
       await prisma.task.deleteMany({
         where: { id: { in: taskIds } }
       });
    }

    res.json({ message: 'Cleanup complete' });
  } catch (error) {
    next(error);
  }
};
