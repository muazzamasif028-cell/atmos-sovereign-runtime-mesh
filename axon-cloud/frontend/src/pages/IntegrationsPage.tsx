import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  levelRequired: number;
  version: string;
  actions: string[];
  triggers: string[];
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#4ade80',
  2: '#60a5fa',
  3: '#a78bfa',
  4: '#f59e0b',
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'Foundation',
  2: 'Advanced',
  3: 'Intelligent',
  4: 'Sovereign',
};

const CATEGORY_ICONS: Record<string, string> = {
  communication: '💬',
  database: '🗄️',
  storage: '📦',
  crm: '👥',
  analytics: '📊',
  ai: '🤖',
  devops: '⚙️',
  finance: '💳',
  productivity: '⚡',
  security: '🔒',
};

export default function IntegrationsPage() {
  const { token, user } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (showAll) params.set('level', '4');
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/integrations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { integrations: Integration[]; total: number };
      setIntegrations(data.integrations);
      setTotal(data.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, showAll, categoryFilter]);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const categories = Array.from(new Set(integrations.map((i) => i.category)));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#e2e8f0', margin: 0, fontSize: '22px' }}>Integrations</h1>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{total} available</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show all levels
          </label>
        </div>
      </div>

      {loading && <div style={{ color: '#94a3b8' }}>Loading…</div>}
      {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {integrations.map((integration) => {
          const levelColor = LEVEL_COLORS[integration.levelRequired] ?? '#94a3b8';
          const locked = integration.levelRequired > (user?.level ?? 1);
          const icon = CATEGORY_ICONS[integration.category] ?? '🔌';

          return (
            <div
              key={integration.id}
              style={{
                background: '#0f172a',
                border: `1px solid ${locked ? '#1e293b' : '#1e293b'}`,
                borderRadius: '10px',
                padding: '16px',
                opacity: locked ? 0.6 : 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Level accent */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: levelColor,
                }}
              />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '24px' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px' }}>
                      {integration.name}
                    </span>
                    {locked && <span style={{ fontSize: '12px' }}>🔒</span>}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '10px' }}>
                    {integration.description}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        color: levelColor,
                        border: `1px solid ${levelColor}`,
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      {LEVEL_LABELS[integration.levelRequired]}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#475569',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      {integration.category}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#475569',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      v{integration.version}
                    </span>
                  </div>

                  {integration.actions.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ color: '#475569', fontSize: '10px', marginBottom: '3px' }}>ACTIONS</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {integration.actions.map((a) => (
                          <span
                            key={a}
                            style={{
                              fontSize: '10px',
                              color: '#94a3b8',
                              background: '#1e293b',
                              borderRadius: '3px',
                              padding: '1px 5px',
                            }}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
