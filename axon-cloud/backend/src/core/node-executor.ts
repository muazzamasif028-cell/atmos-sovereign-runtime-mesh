/**
 * Axon Cloud — Node Executor
 *
 * Handles the actual execution of individual workflow nodes.
 * Each NodeType maps to a dedicated handler that receives the node's
 * parameters and the current execution context.
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import { logger } from './logger';
import type { WorkflowNode, ExecutionContext, NodeType } from './workflow-engine';

// ── HTTP helper ───────────────────────────────────────────────────────────────

interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

function httpRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = body ? JSON.stringify(body) : undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AxonCloud/0.1',
      ...headers,
    };
    if (bodyStr) reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr).toString();

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: method.toUpperCase(),
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => (raw += chunk.toString()));
        res.on('end', () => {
          let parsedBody: unknown = raw;
          try {
            parsedBody = JSON.parse(raw);
          } catch {
            // keep as string
          }
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: parsedBody,
          });
        });
      }
    );

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Node handlers ─────────────────────────────────────────────────────────────

type NodeHandler = (
  params: Record<string, unknown>,
  ctx: ExecutionContext
) => Promise<unknown>;

const handlers: Record<NodeType, NodeHandler> = {
  // Trigger — entry point, returns the trigger payload
  trigger: async (_params, ctx) => {
    return ctx.triggerData ?? {};
  },

  // HTTP Request — call an external URL
  http_request: async (params, _ctx) => {
    const url = params.url as string;
    const method = (params.method as string) || 'GET';
    const headers = (params.headers as Record<string, string>) || {};
    const body = params.body;

    if (!url) throw new Error('http_request node requires a "url" parameter.');

    const response = await httpRequest(url, method, headers, body);

    if (response.status >= 400) {
      throw new Error(
        `HTTP request to ${url} failed with status ${response.status}`
      );
    }

    return response;
  },

  // Transform — apply a JS expression to reshape data
  transform: async (params, ctx) => {
    const expression = params.expression as string;
    const inputNodeId = params.inputNodeId as string | undefined;

    if (!expression) throw new Error('transform node requires an "expression" parameter.');

    const input = inputNodeId ? ctx.nodeOutputs[inputNodeId] : ctx.nodeOutputs;

    // eslint-disable-next-line no-new-func
    const fn = new Function('input', 'context', `"use strict"; return (${expression});`);
    return fn(input, ctx);
  },

  // Condition — evaluates a boolean expression; returns { passed: boolean }
  condition: async (params, ctx) => {
    const expression = params.expression as string;
    if (!expression) throw new Error('condition node requires an "expression" parameter.');

    const inputNodeId = params.inputNodeId as string | undefined;
    const input = inputNodeId ? ctx.nodeOutputs[inputNodeId] : ctx.nodeOutputs;

    // eslint-disable-next-line no-new-func
    const fn = new Function('input', 'context', `"use strict"; return Boolean(${expression});`);
    const passed = fn(input, ctx) as boolean;
    return { passed };
  },

  // Loop — iterate over an array and collect results
  loop: async (params, ctx) => {
    const inputNodeId = params.inputNodeId as string;
    const items = (
      inputNodeId ? ctx.nodeOutputs[inputNodeId] : params.items
    ) as unknown[];

    if (!Array.isArray(items)) {
      throw new Error('loop node requires an array input.');
    }

    const expression = params.expression as string | undefined;
    if (!expression) return items;

    // eslint-disable-next-line no-new-func
    const fn = new Function('item', 'index', 'context', `"use strict"; return (${expression});`);
    return Promise.all(items.map((item, index) => fn(item, index, ctx)));
  },

  // Delay — pause execution for a given number of milliseconds
  delay: async (params, _ctx) => {
    const ms = Number(params.ms ?? 1000);
    if (ms > 60_000) throw new Error('delay node: maximum delay is 60 000 ms.');
    await new Promise((r) => setTimeout(r, ms));
    return { delayed: ms };
  },

  // Email — placeholder; real implementation connects to an SMTP/SES provider
  email: async (params, _ctx) => {
    const to = params.to as string;
    const subject = params.subject as string;
    const body = params.body as string;

    if (!to || !subject) {
      throw new Error('email node requires "to" and "subject" parameters.');
    }

    logger.info('Email node (stub) — would send email', { to, subject });
    return { sent: true, to, subject, bodyLength: body?.length ?? 0 };
  },

  // Database — run a parameterised SQL query
  database: async (params, _ctx) => {
    const { db } = await import('../db/schema');
    const sql = params.sql as string;
    const values = (params.values as unknown[]) ?? [];

    if (!sql) throw new Error('database node requires a "sql" parameter.');

    const result = await db.query(sql, values);
    return { rowCount: result.rowCount, rows: result.rows };
  },

  // Webhook — emit an outbound webhook to a target URL
  webhook: async (params, ctx) => {
    const url = params.url as string;
    if (!url) throw new Error('webhook node requires a "url" parameter.');

    const payload = {
      executionId: ctx.executionId,
      workflowId: ctx.workflowId,
      timestamp: new Date().toISOString(),
      data: params.data ?? ctx.nodeOutputs,
    };

    const response = await httpRequest(url, 'POST', {}, payload);
    return { delivered: response.status < 400, status: response.status };
  },

  // Code — execute arbitrary JS (sandboxed via Function constructor)
  code: async (params, ctx) => {
    const code = params.code as string;
    if (!code) throw new Error('code node requires a "code" parameter.');

    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'context',
      'require',
      `"use strict";\n${code}`
    );
    // Deny require access in code nodes
    return fn(ctx, () => {
      throw new Error('require() is not available in code nodes.');
    });
  },

  // Merge — combine outputs from multiple nodes into a single object
  merge: async (params, ctx) => {
    const nodeIds = params.nodeIds as string[];
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      throw new Error('merge node requires a non-empty "nodeIds" array.');
    }
    const merged: Record<string, unknown> = {};
    for (const id of nodeIds) {
      merged[id] = ctx.nodeOutputs[id];
    }
    return merged;
  },

  // Split — fan-out a single value into parallel branches (returns the value as-is;
  // the engine handles routing via edges)
  split: async (params, ctx) => {
    const inputNodeId = params.inputNodeId as string | undefined;
    return inputNodeId ? ctx.nodeOutputs[inputNodeId] : ctx.nodeOutputs;
  },
};

// ── NodeExecutor ──────────────────────────────────────────────────────────────

export class NodeExecutor {
  async execute(node: WorkflowNode, ctx: ExecutionContext): Promise<unknown> {
    const handler = handlers[node.type];
    if (!handler) {
      throw new Error(`Unknown node type: "${node.type}"`);
    }
    return handler(node.parameters, ctx);
  }
}
