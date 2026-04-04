import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamsSchema,
  getTasksQuerySchema,
} from '../validations/taskValidations';
import {
  createTask,
  getTasks,
  updateTask,
  toggleTaskStatus,
  deleteTask,
  getMissedTasks,
  syncMissedTasks,
} from '../controllers/taskController';
import { syncMissedTasksSchema } from '../validations/taskValidations';

const router = Router();

// Protect all task routes
router.use(authenticate);

// POST /tasks
router.post('/', validateRequest({ body: createTaskSchema }), createTask);

// GET /tasks
router.get('/', validateRequest({ query: getTasksQuerySchema }), getTasks);

// GET /tasks/missed
router.get('/missed', getMissedTasks);

// POST /tasks/missed/sync
router.post(
  '/missed/sync',
  validateRequest({ body: syncMissedTasksSchema }),
  syncMissedTasks,
);

// PATCH /tasks/:id
router.patch(
  '/:id',
  validateRequest({ params: taskIdParamsSchema, body: updateTaskSchema }),
  updateTask,
);

// PATCH /tasks/:id/toggle
router.patch(
  '/:id/toggle',
  validateRequest({ params: taskIdParamsSchema }),
  toggleTaskStatus,
);

// DELETE /tasks/:id
router.delete(
  '/:id',
  validateRequest({ params: taskIdParamsSchema }),
  deleteTask,
);

export default router;
