/**
 * Axon Cloud — Level 4: Sovereign
 *
 * The Sovereign level is the apex of the Axon architecture.  It provides
 * multi-tenant orchestration, a federated execution mesh, a policy engine,
 * full audit sovereignty, and compliance tooling.
 *
 * Capabilities unlocked at Level 4 (in addition to Levels 1–3):
 *  - Multi-tenant workflow isolation
 *  - Federated execution mesh (cross-region / cross-cloud dispatch)
 *  - Policy engine (OPA-compatible rule evaluation)
 *  - Full audit sovereignty (immutable audit log, WORM storage)
 *  - Data residency controls (pin executions to specific regions)
 *  - Compliance exports (SOC 2, GDPR, HIPAA report generation)
 *  - Custom SLA enforcement
 *  - Workflow governance (approval gates, change management)
 *  - Integration access: Axon Execution Mesh
 */

import { getMergedIntelligentCapabilities } from './level3-intelligent';

export interface SovereignCapabilities {
  additionalNodeTypes: string[];
  additionalIntegrations: string[];
  additionalFeatures: string[];
  complianceFrameworks: string[];
  maxTenantsPerInstance: number;
  maxWorkflowsPerTenant: number;
}

export const SOVEREIGN_CAPABILITIES: SovereignCapabilities = {
  additionalNodeTypes: [
    'policy_gate',
    'approval_gate',
    'audit_emit',
    'mesh_dispatch',
    'compliance_check',
    'data_residency',
    'sla_monitor',
    'governance_review',
  ],
  additionalIntegrations: ['axon_mesh'],
  additionalFeatures: [
    'multi_tenant_isolation',
    'federated_execution_mesh',
    'policy_engine',
    'immutable_audit_log',
    'data_residency_controls',
    'compliance_exports',
    'sla_enforcement',
    'workflow_governance',
    'approval_workflows',
    'change_management',
    'cross_region_execution',
    'worm_audit_storage',
    'gdpr_tooling',
    'soc2_reporting',
    'hipaa_controls',
  ],
  complianceFrameworks: ['SOC 2 Type II', 'GDPR', 'HIPAA', 'ISO 27001', 'PCI DSS'],
  maxTenantsPerInstance: 1_000,
  maxWorkflowsPerTenant: 100_000,
};

export function getMergedSovereignCapabilities() {
  const intelligent = getMergedIntelligentCapabilities();
  return {
    ...intelligent,
    maxWorkflows: SOVEREIGN_CAPABILITIES.maxWorkflowsPerTenant,
    maxConcurrentExecutions: 2_000,
    executionHistoryDays: 2_555, // 7 years for compliance
    nodeTypes: [...intelligent.nodeTypes, ...SOVEREIGN_CAPABILITIES.additionalNodeTypes],
    integrations: [...intelligent.integrations, ...SOVEREIGN_CAPABILITIES.additionalIntegrations],
    features: [...intelligent.features, ...SOVEREIGN_CAPABILITIES.additionalFeatures],
    complianceFrameworks: SOVEREIGN_CAPABILITIES.complianceFrameworks,
    maxTenantsPerInstance: SOVEREIGN_CAPABILITIES.maxTenantsPerInstance,
  };
}

// ── Policy Engine ─────────────────────────────────────────────────────────────

export type PolicyEffect = 'allow' | 'deny';

export interface Policy {
  id: string;
  name: string;
  description: string;
  /** OPA-style Rego rule expressed as a JS predicate for evaluation */
  rule: (context: PolicyContext) => boolean;
  effect: PolicyEffect;
  priority: number;
}

export interface PolicyContext {
  userId: string;
  userRole: string;
  userLevel: number;
  tenantId?: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyDecision {
  allowed: boolean;
  matchedPolicies: string[];
  reason: string;
}

export class PolicyEngine {
  private policies: Policy[] = [];

  register(policy: Policy): void {
    this.policies.push(policy);
    // Keep sorted by priority (higher = evaluated first)
    this.policies.sort((a, b) => b.priority - a.priority);
  }

  evaluate(context: PolicyContext): PolicyDecision {
    const matched: string[] = [];

    for (const policy of this.policies) {
      let matches = false;
      try {
        matches = policy.rule(context);
      } catch {
        // Policy evaluation error — treat as no-match
        continue;
      }

      if (matches) {
        matched.push(policy.id);
        if (policy.effect === 'deny') {
          return {
            allowed: false,
            matchedPolicies: matched,
            reason: `Denied by policy: ${policy.name}`,
          };
        }
      }
    }

    return {
      allowed: true,
      matchedPolicies: matched,
      reason: matched.length > 0 ? 'Allowed by matching policies.' : 'No policies matched — default allow.',
    };
  }
}

// ── Audit Sovereignty ─────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  tenantId?: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  /** SHA-256 hash of the previous entry — forms an immutable chain */
  previousHash: string;
  hash: string;
}

import crypto from 'crypto';

export function computeAuditHash(entry: Omit<AuditEntry, 'hash'>): string {
  const payload = JSON.stringify({
    id: entry.id,
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    timestamp: entry.timestamp.toISOString(),
    previousHash: entry.previousHash,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ── Compliance Report Generator (stub) ───────────────────────────────────────

export type ComplianceFramework = 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001' | 'PCIDSS';

export interface ComplianceReport {
  framework: ComplianceFramework;
  generatedAt: Date;
  tenantId?: string;
  period: { from: Date; to: Date };
  controls: Array<{
    id: string;
    description: string;
    status: 'pass' | 'fail' | 'not_applicable';
    evidence?: string;
  }>;
  overallStatus: 'compliant' | 'non_compliant' | 'partial';
}

export function generateComplianceReport(
  framework: ComplianceFramework,
  tenantId: string | undefined,
  period: { from: Date; to: Date }
): ComplianceReport {
  // Stub — real implementation queries audit_logs and applies framework controls
  return {
    framework,
    generatedAt: new Date(),
    tenantId,
    period,
    controls: [
      {
        id: `${framework}-CC1.1`,
        description: 'Access control policies are defined and enforced.',
        status: 'pass',
        evidence: 'JWT-based RBAC with role and level enforcement on all API routes.',
      },
      {
        id: `${framework}-CC2.1`,
        description: 'All privileged actions are logged in the immutable audit trail.',
        status: 'pass',
        evidence: 'audit_logs table with SHA-256 hash chaining.',
      },
      {
        id: `${framework}-CC6.1`,
        description: 'Data in transit is encrypted using TLS 1.2+.',
        status: 'pass',
        evidence: 'All endpoints served over HTTPS; DATABASE_SSL enforced.',
      },
    ],
    overallStatus: 'compliant',
  };
}
