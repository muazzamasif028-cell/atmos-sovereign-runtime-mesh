/**
 * Axon Cloud — Executions API
 *
 * GET  /api/executions/:id          Get execution status & result
 * GET  /api/executions              List executions (with filters)
 * POST /api/executions/:id/cancel   Cancel a running execution
 */

import { Router, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../db/schema';
import { requireAuth, AuthRequest } from './middleware/auth-middleware';

const router = Router();

router.use(requireAuth);

// ── GET /api/executions ───────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('workflowId').optional().isUUID(),
    query('status').optional().isIn(['pending', 'running', 'success', 'failed', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (req.query.workflowId) {
      conditions.push(`e.workflow_id = $${paramIdx++}`);
      values.push(req.query.workflowId);
    }
    if (req.query.status) {
      conditions.push(`e.status = $${paramIdx++}`);
      values.push(req.query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const [rows, countResult] = await Promise.all([
        db.query(
          `SELECT e.id, e.workflow_id, e.status, e.started_at, e.ended_at, e.duration_ms,
                  w.name AS workflow_name
           FROM workflow_executions e
           LEFT JOIN workflows w ON w.id = e.workflow_id
           ${where}
           ORDER BY e.started_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...values, limit, offset]
        ),
        db.query(
          `SELECT COUNT(*) FROM workflow_executions e ${where}`,
          values
        ),
      ]);

      const total = Number(countResult.rows[0].count);

      res.json({
        executions: rows.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/executions/:id ───────────────────────────────────────────────────

router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await db.query(
        `SELECT e.id, e.workflow_id, e.status, e.result, e.trigger_data,
                e.started_at, e.ended_at, e.duration_ms,
                w.name AS workflow_name, w.level AS workflow_level
         FROM workflow_executions e
         LEFT JOIN workflows w ON w.id = e.workflow_id
         WHERE e.id = $1`,
        [req.params.id]
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(404).json({ error: 'Execution not found.' });
        return;
      }

      res.json({ execution: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/executions/:id/cancel ──────────────────────────────────────────

router.post(
  '/:id/cancel',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await db.query(
        `UPDATE workflow_executions
         SET status = 'cancelled', ended_at = NOW()
         WHERE id = $1 AND status IN ('pending', 'running')
         RETURNING id, status`,
        [req.params.id]
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(404).json({
          error: 'Execution not found or is not in a cancellable state.',
        });
        return;
      }

      res.json({ execution: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
