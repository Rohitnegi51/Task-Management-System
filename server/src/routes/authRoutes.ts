import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  register,
  login,
  refresh,
  logout,
} from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Example of a protected route using the authMiddleware
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (_error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
