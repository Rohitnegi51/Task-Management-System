import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { skipTasks, getProgress } from '../controllers/progressController';

const router = Router();

// Protect all progress routes
router.use(authenticate);

// POST /progress/skip
router.post('/skip', skipTasks);

// GET /progress
router.get('/', getProgress);

export default router;
