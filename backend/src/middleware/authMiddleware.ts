import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/jwt.js';

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('Authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Authentication token is required.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (
      typeof payload !== 'object'
      || payload === null
      || !('sub' in payload)
      || typeof payload.sub !== 'string'
      || !payload.sub
    ) {
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }
    req.authUserId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}
