import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  level: number;
  active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Foundation',
  2: 'Advanced',
  3: 'Intelligent',
  4: 'Sovereign',
};

const LEVEL_COLORS: Record<number, string> = {
  1: '#4ade80',
  2: '#60a5fa',
  3: '#a78bfa',
  4: '#f59e0b',
};

export default function WorkflowsPage() {
  const { token } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/workflows?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        workflows: Workflow[];
        pagination: { total: number };
      };
      setWorkflows(data.workflows);
      setTotal(data.pagination.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    try {
      const res = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { executionId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Execution failed');
      alert(`Execution started: ${data.executionId}`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete workflow "${name}"?`)) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#e2e8f0', margin: 0, fontSize: '22px' }}>Workflows</h1>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{total} total</div>
        </div>
        <Link
          to="/workflows/new/edit"
          style={{
            background: '#0369a1',
            color: '#fff',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          + New Workflow
        </Link>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Loading…</div>}
      {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}

      {!loading && !error && workflows.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            color: '#475569',
            background: '#0f172a',
            borderRadius: '12px',
            border: '1px dashed #1e293b',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚡</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>No workflows yet</div>
          <div style={{ fontSize: '13px' }}>Create your first workflow to get started.</div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '12px' }}>
        {workflows.map((wf) => {
          const levelColor = LEVEL_COLORS[wf.level] ?? '#94a3b8';
          return (
            <div
              key={wf.id}
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Level indicator */}
              <div
                style={{
                  width: '4px',
                  height: '48px',
                  background: levelColor,
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              />

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '15px' }}>{wf.name}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: levelColor,
                      border: `1px solid ${levelColor}`,
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}
                  >
                    {LEVEL_LABELS[wf.level] ?? `Level ${wf.level}`}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: wf.active ? '#4ade80' : '#64748b',
                      border: `1px solid ${wf.active ? '#4ade80' : '#334155'}`,
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}
                  >
                    {wf.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {wf.description && (
                  <div style={{ color: '#64748b', fontSize: '13px' }}>{wf.description}</div>
                )}
                <div style={{ color: '#334155', fontSize: '11px', marginTop: '4px' }}>
                  Updated {new Date(wf.updated_at).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleExecute(wf.id)}
                  disabled={!wf.active || executingId === wf.id}
                  style={{
                    background: '#064e3b',
                    border: '1px solid #065f46',
                    color: '#4ade80',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: wf.active ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    opacity: wf.active ? 1 : 0.5,
                  }}
                >
                  {executingId === wf.id ? '…' : '▶ Run'}
                </button>
                <Link
                  to={`/workflows/${wf.id}/edit`}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    textDecoration: 'none',
                    fontSize: '13px',
                  }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(wf.id, wf.name)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #334155',
                    color: '#64748b',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
