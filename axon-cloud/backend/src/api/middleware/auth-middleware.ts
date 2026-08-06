/**
 * Axon Cloud — Auth Middleware
 *
 * Verifies the Bearer JWT on protected routes and attaches the decoded
 * payload to `req.user`.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'axon-dev-secret-change-in-production';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  level: 1 | 2 | 3 | 4;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token is invalid or expired.' });
  }
}

export function requireRole(...roles: Array<'admin' | 'editor' | 'viewer'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    next();
  };
}

export function requireLevel(minLevel: 1 | 2 | 3 | 4) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.level < minLevel) {
      res
        .status(403)
        .json({ error: `This feature requires Level ${minLevel} or above.` });
      return;
    }
    next();
  };
}
