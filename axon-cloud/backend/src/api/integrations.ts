/**
 * Axon Cloud — Integrations API
 *
 * GET /api/integrations          List available integrations (filtered by level)
 * GET /api/integrations/:id      Get integration details
 */

import { Router, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { integrationRegistry } from '../core/integration-registry';
import { requireAuth, AuthRequest } from './middleware/auth-middleware';

const router = Router();

router.use(requireAuth);

// ── GET /api/integrations ─────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('level').optional().isInt({ min: 1, max: 4 }),
    query('category').optional().isString(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      // Default: show integrations up to the user's own level
      const maxLevel = req.query.level
        ? Number(req.query.level)
        : (req.user!.level as number);

      let integrations = integrationRegistry.getByLevel(
        maxLevel as 1 | 2 | 3 | 4
      );

      if (req.query.category) {
        integrations = integrations.filter(
          (i) => i.category === req.query.category
        );
      }

      res.json({ integrations, total: integrations.length });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/integrations/:id ─────────────────────────────────────────────────

router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const integration = integrationRegistry.getById(req.params.id);

      if (!integration) {
        res.status(404).json({ error: 'Integration not found.' });
        return;
      }

      // Enforce level gate
      if (integration.levelRequired > req.user!.level) {
        res.status(403).json({
          error: `This integration requires Level ${integration.levelRequired}.`,
        });
        return;
      }

      res.json({ integration });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
