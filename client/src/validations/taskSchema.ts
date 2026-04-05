import { z } from 'zod';

export const TaskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']);
export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().optional(),
  status: TaskStatusEnum.default('PENDING'),
  priority: TaskPriorityEnum.default('MEDIUM'),
  dueDate: z.string().nullable().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

export type TaskFormValues = z.infer<typeof taskSchema>;