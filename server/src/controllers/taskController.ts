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
    const { page, limit, status, search } = req.query as any;

    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {
      userId,
    };

    if (status) {
      whereClause.status = status;
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
        orderBy: [
          // Sort by status: PENDING -> IN_PROGRESS -> COMPLETED
          { status: 'asc' },
          // Then by priority: HIGH -> MEDIUM -> LOW (descending order essentially, since HIGH is lexicographically 'H' < 'M' < 'L'? Actually, enum sorting in Prisma Postgres is by definition order in schema if it's a native enum, or alphabetical if it's text. Let's sort by priority).
          // Wait, 'HIGH' vs 'LOW'. Alphabetical: H, L, M. That's wrong.
          // In Prisma, Enums are sorted by the order they are defined in the schema.
          // Schema: LOW, MEDIUM, HIGH. So 'desc' will sort HIGH -> MEDIUM -> LOW.
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
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

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

export const getMissedTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Calculate start of today in local time or UTC (assuming UTC for simplicity, or matching DB timezone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const missedTasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          lt: today, // less than start of today
        },
        status: {
          notIn: ['COMPLETED', 'ARCHIVED'],
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json({ data: missedTasks });
  } catch (error) {
    next(error);
  }
};

export const syncMissedTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { action } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find tasks that need syncing to ensure they belong to user
    const missedTasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: { lt: today },
        status: { notIn: ['COMPLETED', 'ARCHIVED'] },
      },
    });

    const missedTaskIds = missedTasks.map((t) => t.id);

    if (missedTaskIds.length === 0) {
      res.json({ message: 'No missed tasks found', count: 0 });
      return;
    }

    if (action === 'MOVE') {
      const now = new Date();
      await prisma.task.updateMany({
        where: { id: { in: missedTaskIds } },
        data: { dueDate: now },
      });
    } else if (action === 'ARCHIVE') {
      await prisma.task.updateMany({
        where: { id: { in: missedTaskIds } },
        data: { status: 'ARCHIVED' },
      });
    }

    res.json({
      message: 'Missed tasks synced successfully',
      count: missedTaskIds.length,
    });
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
