import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WorkflowEditor from '../components/WorkflowEditor';
import NodePalette from '../components/NodePalette';

interface WorkflowDefinition {
  nodes: Array<{ id: string; type: string; name: string; parameters: Record<string, unknown> }>;
  edges: Array<{ from: string; to: string; condition?: string }>;
}

const DEFAULT_DEFINITION: WorkflowDefinition = {
  nodes: [{ id: 'trigger_1', type: 'trigger', name: 'Start', parameters: {} }],
  edges: [],
};

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(1);
  const [definition, setDefinition] = useState<WorkflowDefinition>(DEFAULT_DEFINITION);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const res = await fetch(`/api/workflows/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          workflow: {
            name: string;
            description?: string;
            level: number;
            definition: WorkflowDefinition;
          };
        };
        setName(data.workflow.name);
        setDescription(data.workflow.description ?? '');
        setLevel(data.workflow.level);
        setDefinition(data.workflow.definition);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, token]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Workflow name is required.'); return; }
    setSaving(true);
    setError(null);

    try {
      const url = isNew ? '/api/workflows' : `/api/workflows/${id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, level, definition }),
      });
      const data = (await res.json()) as { workflow?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      navigate('/workflows');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8' }}>Loading workflow…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/workflows')}
          style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow name…"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e2e8f0',
              fontSize: '20px',
              fontWeight: 700,
              outline: 'none',
              width: '100%',
            }}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '13px',
              outline: 'none',
              width: '100%',
              marginTop: '2px',
            }}
          />
        </div>

        {/* Level selector */}
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '13px',
          }}
        >
          {[1, 2, 3, 4].map((l) => (
            <option key={l} value={l} disabled={l > (user?.level ?? 1)}>
              Level {l}
            </option>
          ))}
        </select>

        {error && <span style={{ color: '#f87171', fontSize: '13px' }}>{error}</span>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#0369a1',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Editor layout */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <NodePalette
          userLevel={user?.level ?? 1}
          onNodeSelect={(type) => {
            const newNode = {
              id: `${type}_${Date.now()}`,
              type,
              name: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              parameters: {},
            };
            setDefinition((prev) => ({
              ...prev,
              nodes: [...prev.nodes, newNode],
            }));
          }}
        />
        <div style={{ flex: 1 }}>
          <WorkflowEditor
            initialDefinition={definition}
            onChange={setDefinition}
          />
        </div>
      </div>
    </div>
  );
}
