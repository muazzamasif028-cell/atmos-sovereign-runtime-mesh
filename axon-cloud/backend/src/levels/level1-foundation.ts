/**
 * Axon Cloud — Level 1: Foundation
 *
 * The Foundation level provides the core primitives every workflow platform
 * needs: a reliable execution engine, basic node types, REST API access,
 * structured logging, and a PostgreSQL-backed persistence layer.
 *
 * Capabilities unlocked at Level 1:
 *  - Sequential workflow execution
 *  - Node types: trigger, http_request, transform, condition, delay, email,
 *                database, webhook, code, merge, split
 *  - Execution history & status tracking
 *  - JWT-based authentication (viewer / editor / admin roles)
 *  - Integration access: HTTP, PostgreSQL, Redis, Email (SMTP), S3
 *  - Rate limiting & request validation
 *  - Structured JSON logging via Winston
 */

export interface FoundationCapabilities {
  maxWorkflows: number;
  maxConcurrentExecutions: number;
  executionHistoryDays: number;
  nodeTypes: string[];
  integrations: string[];
  features: string[];
}

export const FOUNDATION_CAPABILITIES: FoundationCapabilities = {
  maxWorkflows: 50,
  maxConcurrentExecutions: 10,
  executionHistoryDays: 30,
  nodeTypes: [
    'trigger',
    'http_request',
    'transform',
    'condition',
    'delay',
    'email',
    'database',
    'webhook',
    'code',
    'merge',
    'split',
  ],
  integrations: ['http', 'postgresql', 'redis', 'email_smtp', 's3'],
  features: [
    'sequential_execution',
    'retry_logic',
    'execution_logging',
    'jwt_auth',
    'role_based_access',
    'rate_limiting',
    'input_validation',
    'rest_api',
    'execution_history',
    'workflow_versioning',
  ],
};

/**
 * Validate that a workflow definition only uses node types available at Level 1.
 */
export function validateFoundationWorkflow(
  nodes: Array<{ type: string; id: string }>
): { valid: boolean; unsupportedNodes: string[] } {
  const unsupportedNodes = nodes
    .filter((n) => !FOUNDATION_CAPABILITIES.nodeTypes.includes(n.type))
    .map((n) => `${n.id} (${n.type})`);

  return { valid: unsupportedNodes.length === 0, unsupportedNodes };
}

/**
 * Return a human-readable summary of Level 1 capabilities.
 */
export function getFoundationSummary(): string {
  return [
    '=== Axon Cloud — Level 1: Foundation ===',
    `Max workflows:              ${FOUNDATION_CAPABILITIES.maxWorkflows}`,
    `Max concurrent executions:  ${FOUNDATION_CAPABILITIES.maxConcurrentExecutions}`,
    `Execution history:          ${FOUNDATION_CAPABILITIES.executionHistoryDays} days`,
    `Node types:                 ${FOUNDATION_CAPABILITIES.nodeTypes.length}`,
    `Integrations:               ${FOUNDATION_CAPABILITIES.integrations.join(', ')}`,
  ].join('\n');
}
