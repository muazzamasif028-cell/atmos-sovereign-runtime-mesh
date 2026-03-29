import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ExecutionMonitor from '../components/ExecutionMonitor';

interface Execution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
}

const STATUS_COLORS = {
  pending: '#94a3b8',
  running: '#38bdf8',
  success: '#4ade80',
  failed: '#f87171',
  cancelled: '#f59e0b',
};

export default function ExecutionsPage() {
  const { token } = useAuth();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchExecutions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/executions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        executions: Execution[];
        pagination: { total: number };
      };
      setExecutions(data.executions);
      setTotal(data.pagination.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { fetchExecutions(); }, [fetchExecutions]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 400px' : '1fr', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#e2e8f0', margin: 0, fontSize: '22px' }}>Executions</h1>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{total} total</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '13px',
              }}
            >
              <option value="">All statuses</option>
              {['pending', 'running', 'success', 'failed', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={fetchExecutions}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading && <div style={{ color: '#94a3b8' }}>Loading…</div>}
        {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}

        <div style={{ display: 'grid', gap: '8px' }}>
          {executions.map((ex) => {
            const color = STATUS_COLORS[ex.status];
            const isSelected = ex.id === selectedId;
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedId(isSelected ? null : ex.id)}
                style={{
                  background: '#0f172a',
                  border: `1px solid ${isSelected ? color : '#1e293b'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ color, fontSize: '16px' }}>
                  {ex.status === 'success' ? '✓' : ex.status === 'failed' ? '✗' : ex.status === 'running' ? '⚡' : '○'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontSize: '14px' }}>
                    {ex.workflow_name ?? ex.workflow_id.slice(0, 8)}
                  </div>
                  <div style={{ color: '#475569', fontSize: '12px' }}>
                    {ex.id.slice(0, 8)}… · {new Date(ex.started_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color, fontSize: '12px', fontWeight: 600 }}>{ex.status}</div>
                  {ex.duration_ms != null && (
                    <div style={{ color: '#475569', fontSize: '11px' }}>{ex.duration_ms} ms</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedId && (
        <div>
          <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Execution Detail
          </div>
          <ExecutionMonitor executionId={selectedId} />
        </div>
      )}
    </div>
  );
}
