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
