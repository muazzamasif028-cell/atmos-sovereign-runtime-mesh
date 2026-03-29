/**
 * Axon Cloud — Level 2: Advanced
 *
 * The Advanced level builds on Foundation to add parallel execution,
 * sub-workflows, event-driven triggers, scheduling, and a richer set of
 * third-party integrations.
 *
 * Capabilities unlocked at Level 2 (in addition to Level 1):
 *  - Parallel branch execution (fan-out / fan-in)
 *  - Sub-workflow invocation (call one workflow from another)
 *  - Cron-based scheduling
 *  - Webhook triggers (inbound HTTP events)
 *  - Advanced branching (switch / case)
 *  - Execution streaming (SSE / WebSocket status updates)
 *  - Integration access: Slack, GitHub, Stripe
 *  - Workflow templates & marketplace
 *  - Team collaboration (shared workflows, comments)
 */

import { FOUNDATION_CAPABILITIES } from './level1-foundation';

export interface AdvancedCapabilities {
  maxWorkflows: number;
  maxConcurrentExecutions: number;
  executionHistoryDays: number;
  additionalNodeTypes: string[];
  additionalIntegrations: string[];
  additionalFeatures: string[];
}

export const ADVANCED_CAPABILITIES: AdvancedCapabilities = {
  maxWorkflows: 500,
  maxConcurrentExecutions: 50,
  executionHistoryDays: 90,
  additionalNodeTypes: [
    'parallel',
    'sub_workflow',
    'switch',
    'wait_for_event',
    'schedule',
    'stream',
  ],
  additionalIntegrations: ['slack', 'github', 'stripe'],
  additionalFeatures: [
    'parallel_execution',
    'sub_workflows',
    'cron_scheduling',
    'webhook_triggers',
    'advanced_branching',
    'execution_streaming',
    'workflow_templates',
    'team_collaboration',
    'workflow_marketplace',
    'execution_replay',
  ],
};

/**
 * Merge Level 1 + Level 2 capabilities into a single flat view.
 */
export function getMergedAdvancedCapabilities() {
  return {
    maxWorkflows: ADVANCED_CAPABILITIES.maxWorkflows,
    maxConcurrentExecutions: ADVANCED_CAPABILITIES.maxConcurrentExecutions,
    executionHistoryDays: ADVANCED_CAPABILITIES.executionHistoryDays,
    nodeTypes: [
      ...FOUNDATION_CAPABILITIES.nodeTypes,
      ...ADVANCED_CAPABILITIES.additionalNodeTypes,
    ],
    integrations: [
      ...FOUNDATION_CAPABILITIES.integrations,
      ...ADVANCED_CAPABILITIES.additionalIntegrations,
    ],
    features: [
      ...FOUNDATION_CAPABILITIES.features,
      ...ADVANCED_CAPABILITIES.additionalFeatures,
    ],
  };
}

// ── Parallel Execution Plan ───────────────────────────────────────────────────

export interface ParallelBranch {
  branchId: string;
  nodeIds: string[];
}

/**
 * Split a set of independent nodes into parallel execution branches.
 * Nodes that share no dependencies can run concurrently.
 */
export function buildParallelBranches(
  nodes: Array<{ id: string; dependsOn?: string[] }>
): ParallelBranch[] {
  const branches: ParallelBranch[] = [];
  const assigned = new Set<string>();

  for (const node of nodes) {
    if (assigned.has(node.id)) continue;

    // Find all nodes that have the same dependency set
    const siblings = nodes.filter(
      (n) =>
        !assigned.has(n.id) &&
        JSON.stringify(n.dependsOn?.sort() ?? []) ===
          JSON.stringify(node.dependsOn?.sort() ?? [])
    );

    if (siblings.length > 1) {
      const branch: ParallelBranch = {
        branchId: `branch_${branches.length + 1}`,
        nodeIds: siblings.map((n) => n.id),
      };
      branches.push(branch);
      siblings.forEach((n) => assigned.add(n.id));
    }
  }

  return branches;
}

// ── Cron Schedule Validator ───────────────────────────────────────────────────

const CRON_REGEX =
  /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;

export function validateCronExpression(expression: string): boolean {
  return CRON_REGEX.test(expression.trim());
}
