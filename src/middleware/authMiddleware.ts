import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include the user payload
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
    };
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access token is missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!token || !secret) {
    res.status(401).json({ error: 'Access token is missing or invalid' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: string };
    req.user = payload;
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Access token has expired or is invalid' });
  }
};
