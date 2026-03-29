/**
 * Axon Cloud — Level 3: Intelligent
 *
 * The Intelligent level adds AI-powered capabilities: node suggestions,
 * anomaly detection, self-healing workflows, natural-language workflow
 * generation, and ML pipeline support.
 *
 * Capabilities unlocked at Level 3 (in addition to Levels 1 & 2):
 *  - AI node suggestions (GPT-powered)
 *  - Natural-language workflow generation
 *  - Anomaly detection on execution metrics
 *  - Self-healing: automatic retry strategy selection
 *  - ML pipeline nodes (data ingestion → transform → model → output)
 *  - Semantic workflow search (vector embeddings)
 *  - Predictive execution time estimation
 *  - Integration access: OpenAI, Pinecone
 */

import { getMergedAdvancedCapabilities } from './level2-advanced';

export interface IntelligentCapabilities {
  additionalNodeTypes: string[];
  additionalIntegrations: string[];
  additionalFeatures: string[];
  aiModels: string[];
}

export const INTELLIGENT_CAPABILITIES: IntelligentCapabilities = {
  additionalNodeTypes: [
    'ai_prompt',
    'ai_classifier',
    'ai_extractor',
    'vector_search',
    'ml_predict',
    'anomaly_detect',
    'auto_retry',
    'nlp_transform',
  ],
  additionalIntegrations: ['openai', 'pinecone'],
  additionalFeatures: [
    'ai_node_suggestions',
    'nl_workflow_generation',
    'anomaly_detection',
    'self_healing_workflows',
    'ml_pipelines',
    'semantic_search',
    'predictive_eta',
    'smart_error_recovery',
    'workflow_insights',
    'execution_analytics',
  ],
  aiModels: ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-large', 'dall-e-3'],
};

export function getMergedIntelligentCapabilities() {
  const advanced = getMergedAdvancedCapabilities();
  return {
    ...advanced,
    maxWorkflows: 5_000,
    maxConcurrentExecutions: 200,
    executionHistoryDays: 365,
    nodeTypes: [...advanced.nodeTypes, ...INTELLIGENT_CAPABILITIES.additionalNodeTypes],
    integrations: [...advanced.integrations, ...INTELLIGENT_CAPABILITIES.additionalIntegrations],
    features: [...advanced.features, ...INTELLIGENT_CAPABILITIES.additionalFeatures],
    aiModels: INTELLIGENT_CAPABILITIES.aiModels,
  };
}

// ── AI Node Suggestion Engine (stub) ─────────────────────────────────────────

export interface NodeSuggestion {
  nodeType: string;
  confidence: number;
  reason: string;
  suggestedParameters?: Record<string, unknown>;
}

/**
 * Suggest the next node to add based on the current workflow context.
 * In production this calls the OpenAI API; here we return rule-based stubs.
 */
export function suggestNextNode(
  currentNodes: Array<{ type: string }>,
  lastOutput?: unknown
): NodeSuggestion[] {
  const suggestions: NodeSuggestion[] = [];
  const types = currentNodes.map((n) => n.type);

  if (types.includes('http_request') && !types.includes('transform')) {
    suggestions.push({
      nodeType: 'transform',
      confidence: 0.92,
      reason: 'HTTP responses typically need reshaping before downstream use.',
    });
  }

  if (types.includes('transform') && !types.includes('condition')) {
    suggestions.push({
      nodeType: 'condition',
      confidence: 0.85,
      reason: 'Add a condition to branch on the transformed data.',
    });
  }

  if (lastOutput && typeof lastOutput === 'object' && 'error' in (lastOutput as object)) {
    suggestions.push({
      nodeType: 'auto_retry',
      confidence: 0.97,
      reason: 'Previous node produced an error — auto-retry can recover automatically.',
    });
  }

  return suggestions;
}

// ── Anomaly Detector (stub) ───────────────────────────────────────────────────

export interface ExecutionMetrics {
  workflowId: string;
  avgDurationMs: number;
  p95DurationMs: number;
  errorRate: number;
  executionsLast24h: number;
}

export interface AnomalyReport {
  anomalyDetected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedAction?: string;
}

export function detectAnomalies(metrics: ExecutionMetrics): AnomalyReport {
  if (metrics.errorRate > 0.5) {
    return {
      anomalyDetected: true,
      severity: 'critical',
      description: `Error rate is ${(metrics.errorRate * 100).toFixed(1)}% — workflow is failing more than half the time.`,
      recommendedAction: 'Review node configurations and enable self-healing retry policies.',
    };
  }

  if (metrics.errorRate > 0.2) {
    return {
      anomalyDetected: true,
      severity: 'high',
      description: `Elevated error rate: ${(metrics.errorRate * 100).toFixed(1)}%.`,
      recommendedAction: 'Inspect recent failed executions for common failure patterns.',
    };
  }

  if (metrics.p95DurationMs > metrics.avgDurationMs * 5) {
    return {
      anomalyDetected: true,
      severity: 'medium',
      description: 'P95 execution time is 5× the average — possible performance regression.',
      recommendedAction: 'Profile slow nodes and consider adding timeouts.',
    };
  }

  return {
    anomalyDetected: false,
    severity: 'low',
    description: 'No anomalies detected.',
  };
}
