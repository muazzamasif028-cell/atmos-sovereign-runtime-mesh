/**
 * ExecutionMonitor — real-time execution status display.
 *
 * Polls the /api/executions/:id endpoint every 2 seconds while the
 * execution is in a non-terminal state, then stops.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

interface Execution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: ExecutionStatus;
  result?: unknown;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
}

interface ExecutionMonitorProps {
  executionId: string;
  onComplete?: (execution: Execution) => void;
}

const STATUS_COLORS: Record<ExecutionStatus, string> = {
  pending: '#94a3b8',
  running: '#38bdf8',
  success: '#4ade80',
  failed: '#f87171',
  cancelled: '#f59e0b',
};

const STATUS_ICONS: Record<ExecutionStatus, string> = {
  pending: '⏳',
  running: '⚡',
  success: '✓',
  failed: '✗',
  cancelled: '⊘',
};

const TERMINAL_STATUSES: ExecutionStatus[] = ['success', 'failed', 'cancelled'];

export default function ExecutionMonitor({ executionId, onComplete }: ExecutionMonitorProps) {
  const { token } = useAuth();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchExecution = useCallback(async () => {
    try {
      const res = await fetch(`/api/executions/${executionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { execution: Execution };
      setExecution(data.execution);
      if (TERMINAL_STATUSES.includes(data.execution.status)) {
        onComplete?.(data.execution);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [executionId, token, onComplete]);

  useEffect(() => {
    fetchExecution();
    const interval = setInterval(() => {
      if (execution && TERMINAL_STATUSES.includes(execution.status)) {
        clearInterval(interval);
        return;
      }
      fetchExecution();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchExecution, execution]);

  if (error) {
    return (
      <div style={{ color: '#f87171', padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
        Failed to load execution: {error}
      </div>
    );
  }

  if (!execution) {
    return (
      <div style={{ color: '#94a3b8', padding: '12px' }}>Loading execution…</div>
    );
  }

  const color = STATUS_COLORS[execution.status];
  const icon = STATUS_ICONS[execution.status];
  const isRunning = execution.status === 'running' || execution.status === 'pending';

  return (
    <div
      style={{
        background: '#0f172a',
        border: `1px solid ${color}40`,
        borderRadius: '8px',
        padding: '16px',
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <div>
          <div style={{ color, fontWeight: 600, fontSize: '14px' }}>
            {execution.status.toUpperCase()}
            {isRunning && <span style={{ marginLeft: '8px', animation: 'pulse 1s infinite' }}>●</span>}
          </div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            {execution.workflow_name ?? execution.workflow_id}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <MetaField label="Execution ID" value={execution.id.slice(0, 8) + '…'} />
        <MetaField label="Started" value={new Date(execution.started_at).toLocaleTimeString()} />
        {execution.ended_at && (
          <MetaField label="Ended" value={new Date(execution.ended_at).toLocaleTimeString()} />
        )}
        {execution.duration_ms != null && (
          <MetaField label="Duration" value={`${execution.duration_ms} ms`} />
        )}
      </div>

      {/* Result */}
      {execution.result && (
        <div>
          <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Result
          </div>
          <pre
            style={{
              background: '#1e293b',
              borderRadius: '6px',
              padding: '10px',
              color: '#e2e8f0',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px',
              margin: 0,
            }}
          >
            {JSON.stringify(execution.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: '#475569', fontSize: '11px' }}>{label}</div>
      <div style={{ color: '#94a3b8', fontSize: '13px' }}>{value}</div>
    </div>
  );
}
