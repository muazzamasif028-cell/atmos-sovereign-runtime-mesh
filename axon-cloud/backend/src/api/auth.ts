/**
 * Axon Cloud — Auth API
 *
 * POST /api/auth/register  — create a new user account
 * POST /api/auth/login     — authenticate and receive a JWT
 * GET  /api/auth/me        — return the current user's profile
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../db/schema';
import { logger } from '../core/logger';
import { requireAuth, AuthRequest } from './middleware/auth-middleware';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'axon-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };

    try {
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount && existing.rowCount > 0) {
        res.status(409).json({ error: 'Email already registered.' });
        return;
      }

      const hashed = await bcrypt.hash(password, 12);
      const result = await db.query(
        `INSERT INTO users (email, password, role, level)
         VALUES ($1, $2, 'viewer', 1)
         RETURNING id, email, role, level, created_at`,
        [email, hashed]
      );

      const user = result.rows[0] as { id: string; email: string; role: string; level: number; created_at: string };

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, level: user.level },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      logger.info('User registered', { userId: user.id, email: user.email });

      res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, level: user.level } });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body as { email: string; password: string };

    try {
      const result = await db.query(
        'SELECT id, email, password, role, level FROM users WHERE email = $1',
        [email]
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }

      const user = result.rows[0] as {
        id: string;
        email: string;
        password: string;
        role: string;
        level: number;
      };

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, level: user.level },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      logger.info('User logged in', { userId: user.id });

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, level: user.level },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get(
  '/me',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await db.query(
        'SELECT id, email, role, level, created_at FROM users WHERE id = $1',
        [req.user!.sub]
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
