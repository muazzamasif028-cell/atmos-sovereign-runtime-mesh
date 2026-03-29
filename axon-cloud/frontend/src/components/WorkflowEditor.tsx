/**
 * WorkflowEditor — visual JSON-based workflow definition editor.
 *
 * Renders a split-pane view: left side shows the node graph (as a simple
 * list for the Foundation level), right side shows the JSON definition
 * with live validation feedback.
 */

import React, { useState, useCallback } from 'react';

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, unknown>;
}

interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: Array<{ from: string; to: string; condition?: string }>;
}

interface WorkflowEditorProps {
  initialDefinition?: WorkflowDefinition;
  onChange?: (definition: WorkflowDefinition) => void;
  readOnly?: boolean;
}

const DEFAULT_DEFINITION: WorkflowDefinition = {
  nodes: [
    { id: 'trigger_1', type: 'trigger', name: 'Start', parameters: {} },
  ],
  edges: [],
};

const NODE_TYPE_COLORS: Record<string, string> = {
  trigger: '#4ade80',
  http_request: '#60a5fa',
  transform: '#a78bfa',
  condition: '#f59e0b',
  loop: '#fb923c',
  delay: '#94a3b8',
  email: '#f472b6',
  database: '#34d399',
  webhook: '#38bdf8',
  code: '#e879f9',
  merge: '#fbbf24',
  split: '#fb7185',
};

export default function WorkflowEditor({
  initialDefinition = DEFAULT_DEFINITION,
  onChange,
  readOnly = false,
}: WorkflowEditorProps) {
  const [definition, setDefinition] = useState<WorkflowDefinition>(initialDefinition);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(initialDefinition, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleJsonChange = useCallback(
    (text: string) => {
      setJsonText(text);
      try {
        const parsed = JSON.parse(text) as WorkflowDefinition;
        setDefinition(parsed);
        setJsonError(null);
        onChange?.(parsed);
      } catch (e) {
        setJsonError((e as Error).message);
      }
    },
    [onChange]
  );

  const selectedNode = definition.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr 320px',
        gap: '16px',
        height: '600px',
        fontFamily: 'monospace',
      }}
    >
      {/* Node list */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          overflow: 'auto',
          padding: '12px',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Nodes ({definition.nodes.length})
        </div>
        {definition.nodes.map((node) => {
          const color = NODE_TYPE_COLORS[node.type] ?? '#94a3b8';
          const isSelected = node.id === selectedNodeId;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
              style={{
                padding: '8px 10px',
                marginBottom: '4px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(56,189,248,0.1)' : 'transparent',
                border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '13px' }}>{node.name}</div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>{node.type}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* JSON editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Definition (JSON)
          {jsonError && (
            <span style={{ color: '#f87171', marginLeft: '12px', textTransform: 'none' }}>
              ✗ {jsonError}
            </span>
          )}
          {!jsonError && (
            <span style={{ color: '#4ade80', marginLeft: '12px', textTransform: 'none' }}>
              ✓ Valid
            </span>
          )}
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
          style={{
            flex: 1,
            background: '#0f172a',
            border: `1px solid ${jsonError ? '#f87171' : '#1e293b'}`,
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '13px',
            padding: '12px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'monospace',
            lineHeight: '1.6',
          }}
        />
      </div>

      {/* Node inspector */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '12px',
          overflow: 'auto',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Inspector
        </div>
        {selectedNode ? (
          <div>
            <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              {selectedNode.name}
            </div>
            <Field label="ID" value={selectedNode.id} />
            <Field label="Type" value={selectedNode.type} />
            <div style={{ marginTop: '12px', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
              PARAMETERS
            </div>
            <pre
              style={{
                background: '#1e293b',
                borderRadius: '6px',
                padding: '8px',
                color: '#e2e8f0',
                fontSize: '12px',
                overflow: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(selectedNode.parameters, null, 2)}
            </pre>
          </div>
        ) : (
          <div style={{ color: '#475569', fontSize: '13px' }}>
            Select a node to inspect its properties.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ color: '#64748b', fontSize: '11px' }}>{label}</div>
      <div style={{ color: '#e2e8f0', fontSize: '13px' }}>{value}</div>
    </div>
  );
}
