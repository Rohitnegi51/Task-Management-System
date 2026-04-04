import { z } from 'zod';

const TaskStatusEnum = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'ARCHIVED',
]);
const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z.string().datetime().optional(), // Expects ISO-8601 string
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z.string().datetime().optional(),
});

export const taskIdParamsSchema = z.object({
  id: z.string().uuid('Invalid task ID'),
});

export const getTasksQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).optional().default('10').transform(Number),
  status: TaskStatusEnum.optional(),
  search: z.string().optional(),
});

export const syncMissedTasksSchema = z.object({
  action: z.enum(['MOVE', 'ARCHIVE']),
});
