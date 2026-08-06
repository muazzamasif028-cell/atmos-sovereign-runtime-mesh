/**
 * NodePalette — displays all available node types grouped by category.
 * Users drag nodes from the palette onto the workflow canvas.
 */

import React, { useState } from 'react';

interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  category: string;
  color: string;
  levelRequired: number;
}

const NODE_DEFINITIONS: NodeDefinition[] = [
  // Triggers
  { type: 'trigger', label: 'Trigger', description: 'Workflow entry point', category: 'Triggers', color: '#4ade80', levelRequired: 1 },
  { type: 'webhook', label: 'Webhook', description: 'Inbound HTTP event', category: 'Triggers', color: '#38bdf8', levelRequired: 1 },
  { type: 'schedule', label: 'Schedule', description: 'Cron-based trigger', category: 'Triggers', color: '#a78bfa', levelRequired: 2 },

  // Actions
  { type: 'http_request', label: 'HTTP Request', description: 'Call any REST API', category: 'Actions', color: '#60a5fa', levelRequired: 1 },
  { type: 'email', label: 'Email', description: 'Send an email', category: 'Actions', color: '#f472b6', levelRequired: 1 },
  { type: 'database', label: 'Database', description: 'Run a SQL query', category: 'Actions', color: '#34d399', levelRequired: 1 },
  { type: 'code', label: 'Code', description: 'Execute custom JS', category: 'Actions', color: '#e879f9', levelRequired: 1 },

  // Logic
  { type: 'condition', label: 'Condition', description: 'Branch on a boolean', category: 'Logic', color: '#f59e0b', levelRequired: 1 },
  { type: 'loop', label: 'Loop', description: 'Iterate over an array', category: 'Logic', color: '#fb923c', levelRequired: 1 },
  { type: 'delay', label: 'Delay', description: 'Pause execution', category: 'Logic', color: '#94a3b8', levelRequired: 1 },
  { type: 'switch', label: 'Switch', description: 'Multi-branch routing', category: 'Logic', color: '#fbbf24', levelRequired: 2 },

  // Data
  { type: 'transform', label: 'Transform', description: 'Reshape data', category: 'Data', color: '#a78bfa', levelRequired: 1 },
  { type: 'merge', label: 'Merge', description: 'Combine node outputs', category: 'Data', color: '#fbbf24', levelRequired: 1 },
  { type: 'split', label: 'Split', description: 'Fan-out to branches', category: 'Data', color: '#fb7185', levelRequired: 1 },

  // AI (Level 3)
  { type: 'ai_prompt', label: 'AI Prompt', description: 'GPT completion', category: 'AI', color: '#818cf8', levelRequired: 3 },
  { type: 'ai_classifier', label: 'AI Classifier', description: 'Classify input text', category: 'AI', color: '#818cf8', levelRequired: 3 },
  { type: 'vector_search', label: 'Vector Search', description: 'Semantic similarity search', category: 'AI', color: '#818cf8', levelRequired: 3 },

  // Sovereign (Level 4)
  { type: 'policy_gate', label: 'Policy Gate', description: 'Enforce access policy', category: 'Sovereign', color: '#f59e0b', levelRequired: 4 },
  { type: 'approval_gate', label: 'Approval Gate', description: 'Require human approval', category: 'Sovereign', color: '#f59e0b', levelRequired: 4 },
  { type: 'audit_emit', label: 'Audit Emit', description: 'Write to immutable audit log', category: 'Sovereign', color: '#f59e0b', levelRequired: 4 },
];

interface NodePaletteProps {
  userLevel?: number;
  onNodeSelect?: (nodeType: string) => void;
}

export default function NodePalette({ userLevel = 1, onNodeSelect }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Triggers', 'Actions', 'Logic', 'Data'])
  );

  const filtered = NODE_DEFINITIONS.filter(
    (n) =>
      (n.label.toLowerCase().includes(search.toLowerCase()) ||
        n.description.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = Array.from(new Set(filtered.map((n) => n.category)));

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div
      style={{
        width: '240px',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Search */}
      <div style={{ padding: '12px', borderBottom: '1px solid #1e293b' }}>
        <input
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#e2e8f0',
            padding: '6px 10px',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Categories */}
      <div style={{ overflow: 'auto', flex: 1 }}>
        {categories.map((cat) => {
          const nodes = filtered.filter((n) => n.category === cat);
          const isExpanded = expandedCategories.has(cat);
          return (
            <div key={cat}>
              <button
                onClick={() => toggleCategory(cat)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #1e293b',
                  color: '#94a3b8',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {cat}
                <span>{isExpanded ? '▾' : '▸'}</span>
              </button>
              {isExpanded &&
                nodes.map((node) => {
                  const locked = node.levelRequired > userLevel;
                  return (
                    <div
                      key={node.type}
                      onClick={() => !locked && onNodeSelect?.(node.type)}
                      title={locked ? `Requires Level ${node.levelRequired}` : node.description}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        opacity: locked ? 0.4 : 1,
                        borderBottom: '1px solid #0f172a',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: node.color,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
                          {node.label}
                          {locked && (
                            <span style={{ color: '#f59e0b', fontSize: '10px', marginLeft: '6px' }}>
                              L{node.levelRequired}
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{node.description}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
