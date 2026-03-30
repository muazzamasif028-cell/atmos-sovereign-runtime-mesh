import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Router setup
// ---------------------------------------------------------------------------

const router = Router();

// Resolve the examples directory relative to this file so the path works
// regardless of the working directory the server is started from.
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// From  axon-cloud/backend/src/api/
// Up to  axon-cloud/
// Into   axon-cloud/examples/
const EXAMPLES_DIR = path.resolve(__dirname, '../../../../examples');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowNode {
  id:          string;
  type:        string;
  name:        string;
  description?: string;
  position?:   { x: number; y: number };
  config:      Record<string, unknown>;
  outputs?:    Record<string, unknown>;
  [key: string]: unknown;
}

interface WorkflowEdge {
  id:      string;
  from:    string;
  to:      string;
  branch?: string;
  label?:  string;
}

interface WorkflowDefinition {
  id:          string;
  name:        string;
  description: string;
  version:     string;
  tags?:       string[];
  nodes:       WorkflowNode[];
  edges:       WorkflowEdge[];
  environment_variables?: {
    required?: Array<{ key: string; description: string }>;
    optional?: Array<{ key: string; default?: string; description: string }>;
  };
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ExampleSummary {
  id:               string;
  name:             string;
  description:      string;
  tags:             string[];
  node_count:       number;
  node_types_used:  string[];
  workflow:         WorkflowDefinition;
}

interface ExamplesResponse {
  examples: ExampleSummary[];
}

interface ApiError {
  error:   string;
  message: string;
  status:  number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives a URL-friendly slug from a workflow filename.
 * e.g. "order-processing-workflow.json" → "order-processing"
 */
function slugFromFilename(filename: string): string {
  return filename
    .replace(/-workflow\.json$/i, '')
    .replace(/\.json$/i, '')
    .toLowerCase();
}

/**
 * Reads and parses all `*-workflow.json` files from the examples directory.
 * Returns an array of ExampleSummary objects sorted alphabetically by name.
 * Throws if the examples directory cannot be read.
 */
function loadExamples(): ExampleSummary[] {
  let files: string[];

  try {
    files = fs.readdirSync(EXAMPLES_DIR);
  } catch (err) {
    throw new Error(
      `Could not read examples directory at "${EXAMPLES_DIR}": ${(err as Error).message}`
    );
  }

  const workflowFiles = files.filter(
    (f) => f.endsWith('-workflow.json') || f === 'workflow.json'
  );

  const examples: ExampleSummary[] = [];

  for (const filename of workflowFiles) {
    const filePath = path.join(EXAMPLES_DIR, filename);
    let raw: string;

    try {
      raw = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      // Skip unreadable files rather than aborting the entire response.
      console.warn(`[workflows/examples] Skipping unreadable file "${filename}": ${(err as Error).message}`);
      continue;
    }

    let workflow: WorkflowDefinition;

    try {
      workflow = JSON.parse(raw) as WorkflowDefinition;
    } catch (err) {
      console.warn(`[workflows/examples] Skipping malformed JSON in "${filename}": ${(err as Error).message}`);
      continue;
    }

    // Derive the unique node types present in this workflow.
    const nodeTypesUsed = Array.from(
      new Set((workflow.nodes ?? []).map((n) => n.type))
    ).sort();

    examples.push({
      id:              slugFromFilename(filename),
      name:            workflow.name        ?? filename,
      description:     workflow.description ?? '',
      tags:            workflow.tags        ?? [],
      node_count:      (workflow.nodes ?? []).length,
      node_types_used: nodeTypesUsed,
      workflow,
    });
  }

  return examples.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// GET /api/workflows/examples
// ---------------------------------------------------------------------------

/**
 * Returns all example workflows bundled with the engine.
 *
 * Response shape:
 * {
 *   "examples": [
 *     {
 *       "id":               "order-processing",
 *       "name":             "E-Commerce Order Processing",
 *       "description":      "...",
 *       "tags":             ["ecommerce", "orders"],
 *       "node_count":       13,
 *       "node_types_used":  ["code", "condition", "database", ...],
 *       "workflow":         { ...full workflow definition... }
 *     }
 *   ]
 * }
 *
 * Errors:
 *   500 — examples directory missing or unreadable
 */
router.get(
  '/examples',
  (_req: Request, res: Response<ExamplesResponse | ApiError>, next: NextFunction) => {
    try {
      const examples = loadExamples();

      const response: ExamplesResponse = { examples };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/workflows/examples/:id
// ---------------------------------------------------------------------------

/**
 * Returns a single example workflow by its slug ID.
 *
 * Path params:
 *   id — slug derived from the filename, e.g. "order-processing"
 *
 * Errors:
 *   404 — no example with the given ID
 *   500 — examples directory missing or unreadable
 */
router.get(
  '/examples/:id',
  (req: Request<{ id: string }>, res: Response<ExampleSummary | ApiError>, next: NextFunction) => {
    try {
      const examples = loadExamples();
      const example  = examples.find((e) => e.id === req.params.id);

      if (!example) {
        const body: ApiError = {
          error:   'not_found',
          message: `No example workflow found with id "${req.params.id}". Available ids: ${examples.map((e) => e.id).join(', ')}`,
          status:  404,
        };
        return res.status(404).json(body);
      }

      res.status(200).json(example);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Error handler (scoped to this router)
// ---------------------------------------------------------------------------

router.use(
  (err: Error, _req: Request, res: Response<ApiError>, _next: NextFunction) => {
    console.error('[workflows] Unhandled error:', err);
    res.status(500).json({
      error:   'internal_server_error',
      message: err.message ?? 'An unexpected error occurred.',
      status:  500,
    });
  }
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default router;
export type { WorkflowDefinition, WorkflowNode, WorkflowEdge, ExampleSummary, ExamplesResponse };
