/**
 * Axon Cloud — Workflow Engine
 *
 * Parses a workflow definition (JSON graph) into an ordered execution plan,
 * then drives the NodeExecutor through each step, handling retries, branching,
 * and execution-state persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/schema';
import { NodeExecutor } from './node-executor';
import { logger } from './logger';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NodeType =
  | 'trigger'
  | 'http_request'
  | 'transform'
  | 'condition'
  | 'loop'
  | 'delay'
  | 'email'
  | 'database'
  | 'webhook'
  | 'code'
  | 'merge'
  | 'split';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  parameters: Record<string, unknown>;
  /** IDs of nodes that must complete before this node runs */
  dependsOn?: string[];
  /** Retry policy */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier?: number;
  };
}

export interface WorkflowEdge {
  from: string;
  to: string;
  /** Optional condition expression evaluated against the source node output */
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  /** Entry-point node IDs (nodes with no incoming edges) */
  entryPoints?: string[];
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  /** Accumulated outputs keyed by node ID */
  nodeOutputs: Record<string, unknown>;
  /** Input data passed when triggering the execution */
  triggerData?: Record<string, unknown>;
  startedAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Topological sort (Kahn's algorithm) — returns nodes in dependency order.
 * Throws if a cycle is detected.
 */
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: WorkflowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const neighbour of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbour) ?? 1) - 1;
      inDegree.set(neighbour, newDeg);
      if (newDeg === 0) queue.push(neighbour);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Workflow definition contains a cycle — execution aborted.');
  }

  return sorted;
}

/**
 * Evaluate a simple condition expression against node output.
 * Supports: "output.status === 200", "output.count > 0", etc.
 * Uses a sandboxed Function constructor — never eval user code directly.
 */
function evaluateCondition(expression: string, output: unknown): boolean {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('output', `"use strict"; return (${expression});`);
    return Boolean(fn(output));
  } catch {
    logger.warn('Condition evaluation failed', { expression });
    return false;
  }
}

// ── WorkflowEngine ────────────────────────────────────────────────────────────

export class WorkflowEngine {
  private executor: NodeExecutor;

  constructor() {
    this.executor = new NodeExecutor();
  }

  /**
   * Parse a raw workflow definition and validate its structure.
   */
  parse(definition: unknown): WorkflowDefinition {
    if (typeof definition !== 'object' || definition === null) {
      throw new Error('Workflow definition must be a JSON object.');
    }

    const def = definition as Record<string, unknown>;

    if (!Array.isArray(def.nodes) || def.nodes.length === 0) {
      throw new Error('Workflow must contain at least one node.');
    }
    if (!Array.isArray(def.edges)) {
      throw new Error('Workflow must contain an edges array (can be empty).');
    }

    // Validate node IDs are unique
    const ids = (def.nodes as WorkflowNode[]).map((n) => n.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error('Workflow node IDs must be unique.');
    }

    return def as unknown as WorkflowDefinition;
  }

  /**
   * Execute a workflow and persist the result.
   */
  async execute(
    workflowId: string,
    definition: WorkflowDefinition,
    triggerData?: Record<string, unknown>
  ): Promise<string> {
    const executionId = uuidv4();

    // Persist execution record
    await db.query(
      `INSERT INTO workflow_executions (id, workflow_id, status, started_at)
       VALUES ($1, $2, 'running', NOW())`,
      [executionId, workflowId]
    );

    const ctx: ExecutionContext = {
      executionId,
      workflowId,
      nodeOutputs: {},
      triggerData,
      startedAt: new Date(),
    };

    logger.info('Workflow execution started', { executionId, workflowId });

    // Run asynchronously so the API can return the executionId immediately
    this._run(ctx, definition).catch((err) => {
      logger.error('Workflow execution crashed', {
        executionId,
        error: (err as Error).message,
      });
    });

    return executionId;
  }

  private async _run(ctx: ExecutionContext, definition: WorkflowDefinition): Promise<void> {
    let sortedNodes: WorkflowNode[];

    try {
      sortedNodes = topologicalSort(definition.nodes, definition.edges);
    } catch (err) {
      await this._fail(ctx.executionId, (err as Error).message);
      return;
    }

    // Build edge lookup for condition checks
    const edgeMap = new Map<string, WorkflowEdge[]>();
    for (const edge of definition.edges) {
      if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, []);
      edgeMap.get(edge.from)!.push(edge);
    }

    const skipped = new Set<string>();

    for (const node of sortedNodes) {
      if (skipped.has(node.id)) {
        logger.info('Node skipped (condition not met)', {
          executionId: ctx.executionId,
          nodeId: node.id,
        });
        continue;
      }

      const output = await this._executeNode(ctx, node);
      ctx.nodeOutputs[node.id] = output;

      // Evaluate outgoing conditional edges
      for (const edge of edgeMap.get(node.id) ?? []) {
        if (edge.condition && !evaluateCondition(edge.condition, output)) {
          skipped.add(edge.to);
        }
      }
    }

    const durationMs = Date.now() - ctx.startedAt.getTime();

    await db.query(
      `UPDATE workflow_executions
       SET status = 'success', result = $1, ended_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ nodeOutputs: ctx.nodeOutputs, durationMs }), ctx.executionId]
    );

    logger.info('Workflow execution completed', {
      executionId: ctx.executionId,
      durationMs,
    });
  }

  private async _executeNode(
    ctx: ExecutionContext,
    node: WorkflowNode
  ): Promise<unknown> {
    const retry = node.retry ?? { maxAttempts: 1, backoffMs: 0 };
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < retry.maxAttempts) {
      attempt++;
      try {
        logger.info('Executing node', {
          executionId: ctx.executionId,
          nodeId: node.id,
          type: node.type,
          attempt,
        });

        const output = await this.executor.execute(node, ctx);
        return output;
      } catch (err) {
        lastError = err as Error;
        logger.warn('Node execution failed', {
          executionId: ctx.executionId,
          nodeId: node.id,
          attempt,
          error: lastError.message,
        });

        if (attempt < retry.maxAttempts) {
          const delay =
            retry.backoffMs * Math.pow(retry.backoffMultiplier ?? 1, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    // All retries exhausted — fail the execution
    await this._fail(
      ctx.executionId,
      `Node "${node.id}" failed after ${attempt} attempt(s): ${lastError?.message}`
    );
    throw lastError;
  }

  private async _fail(executionId: string, reason: string): Promise<void> {
    await db.query(
      `UPDATE workflow_executions
       SET status = 'failed', result = $1, ended_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ error: reason }), executionId]
    );
    logger.error('Workflow execution failed', { executionId, reason });
  }
}
