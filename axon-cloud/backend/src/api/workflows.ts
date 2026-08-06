/**
 * Axon Cloud — Workflows API
 *
 * POST   /api/workflows              Create a workflow
 * GET    /api/workflows              List workflows (paginated)
 * GET    /api/workflows/:id          Get a workflow by ID
 * PUT    /api/workflows/:id          Update a workflow
 * DELETE /api/workflows/:id          Delete a workflow
 * POST   /api/workflows/:id/execute  Trigger a workflow execution
 */

import { Router, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { db } from '../db/schema';
import { WorkflowEngine } from '../core/workflow-engine';
import { logger } from '../core/logger';
import { requireAuth, requireRole, AuthRequest } from './middleware/auth-middleware';

const router = Router();
const engine = new WorkflowEngine();

// All workflow routes require authentication
router.use(requireAuth);

// ── POST /api/workflows ───────────────────────────────────────────────────────

router.post(
  '/',
  requireRole('admin', 'editor'),
  [
    body('name').trim().notEmpty().withMessage('Workflow name is required.'),
    body('definition').isObject().withMessage('Definition must be a JSON object.'),
    body('level').optional().isInt({ min: 1, max: 4 }),
    body('description').optional().isString(),
    body('tags').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description, definition, level = 1, tags = [] } = req.body as {
      name: string;
      description?: string;
      definition: unknown;
      level?: number;
      tags?: string[];
    };

    try {
      // Validate the workflow definition structure
      engine.parse(definition);

      const result = await db.query(
        `INSERT INTO workflows (name, description, definition, level, owner_id, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, description, level, active, tags, created_at`,
        [name, description ?? null, JSON.stringify(definition), level, req.user!.sub, tags]
      );

      logger.info('Workflow created', { workflowId: result.rows[0].id, userId: req.user!.sub });

      res.status(201).json({ workflow: result.rows[0] });
    } catch (err) {
      if ((err as Error).message.includes('Workflow')) {
        res.status(400).json({ error: (err as Error).message });
        return;
      }
      next(err);
    }
  }
);

// ── GET /api/workflows ────────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('level').optional().isInt({ min: 1, max: 4 }),
    query('active').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (req.query.level) {
      conditions.push(`level = $${paramIdx++}`);
      values.push(Number(req.query.level));
    }
    if (req.query.active !== undefined) {
      conditions.push(`active = $${paramIdx++}`);
      values.push(req.query.active === 'true');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const [rows, countResult] = await Promise.all([
        db.query(
          `SELECT id, name, description, level, active, tags, owner_id, created_at, updated_at
           FROM workflows
           ${where}
           ORDER BY created_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...values, limit, offset]
        ),
        db.query(`SELECT COUNT(*) FROM workflows ${where}`, values),
      ]);

      const total = Number(countResult.rows[0].count);

      res.json({
        workflows: rows.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/workflows/:id ────────────────────────────────────────────────────

router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await db.query(
        `SELECT id, name, description, definition, level, active, tags, owner_id, created_at, updated_at
         FROM workflows
         WHERE id = $1`,
        [req.params.id]
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(404).json({ error: 'Workflow not found.' });
        return;
      }

      res.json({ workflow: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/workflows/:id ────────────────────────────────────────────────────

router.put(
  '/:id',
  requireRole('admin', 'editor'),
  [
    body('name').optional().trim().notEmpty(),
    body('definition').optional().isObject(),
    body('level').optional().isInt({ min: 1, max: 4 }),
    body('active').optional().isBoolean(),
    body('tags').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description, definition, level, active, tags } = req.body as {
      name?: string;
      description?: string;
      definition?: unknown;
      level?: number;
      active?: boolean;
      tags?: string[];
    };

    try {
      if (definition) engine.parse(definition);

      const setClauses: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIdx = 1;

      if (name !== undefined) { setClauses.push(`name = $${paramIdx++}`); values.push(name); }
      if (description !== undefined) { setClauses.push(`description = $${paramIdx++}`); values.push(description); }
      if (definition !== undefined) { setClauses.push(`definition = $${paramIdx++}`); values.push(JSON.stringify(definition)); }
      if (level !== undefined) { setClauses.push(`level = $${paramIdx++}`); values.push(level); }
      if (active !== undefined) { setClauses.push(`active = $${paramIdx++}`); values.push(active); }
      if (tags !== undefined) { setClauses.push(`tags = $${paramIdx++}`); values.push(tags); }

      values.push(req.params.id);

      const result = await db.query(
        `UPDATE workflows SET ${setClauses.join(', ')}
         WHERE id = $${paramIdx}
         RETURNING id, name, description, level, active, tags, updated_at`,
        values
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(404).json({ error: 'Workflow not found.' });
        return;
      }

      res.json({ workflow: result.rows[0] });
    } catch (err) {
      if ((err as Error).message.includes('Workflow')) {
        res.status(400).json({ error: (err as Error).message });
        return;
      }
      next(err);
    }
  }
);

// ── DELETE /api/workflows/:id ─────────────────────────────────────────────────

router.delete(
  '/:id',
  requireRole('admin'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await db.query(
        'DELETE FROM workflows WHERE id = $1 RETURNING id',
        [req.params.id]
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(404).json({ error: 'Workflow not found.' });
        return;
      }

      logger.info('Workflow deleted', { workflowId: req.params.id, userId: req.user!.sub });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/workflows/:id/execute ──────────────────────────────────────────

router.post(
  '/:id/execute',
  requireRole('admin', 'editor'),
  [body('triggerData').optional().isObject()],
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await db.query(
        'SELECT id, definition, active FROM workflows WHERE id = $1',
        [req.params.id]
      );

      if (!result.rowCount || result.rowCount === 0) {
        res.status(404).json({ error: 'Workflow not found.' });
        return;
      }

      const workflow = result.rows[0] as { id: string; definition: unknown; active: boolean };

      if (!workflow.active) {
        res.status(400).json({ error: 'Workflow is inactive and cannot be executed.' });
        return;
      }

      const definition = engine.parse(workflow.definition);
      const triggerData = (req.body as { triggerData?: Record<string, unknown> }).triggerData;

      const executionId = await engine.execute(workflow.id, definition, triggerData);

      logger.info('Workflow execution triggered', {
        workflowId: workflow.id,
        executionId,
        userId: req.user!.sub,
      });

      res.status(202).json({ executionId, status: 'running' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
