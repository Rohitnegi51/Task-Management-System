import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
} from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Example of a protected route using the authMiddleware
router.get('/me', authenticate, (req, res) => {
  res.json({ message: 'Authenticated successfully', userId: req.user?.userId });
});

export default router;
