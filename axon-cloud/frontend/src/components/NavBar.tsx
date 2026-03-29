import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LEVEL_COLORS: Record<number, string> = {
  1: '#4ade80',
  2: '#60a5fa',
  3: '#a78bfa',
  4: '#f59e0b',
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { to: '/workflows', label: 'Workflows' },
    { to: '/executions', label: 'Executions' },
    { to: '/integrations', label: 'Integrations' },
  ];

  const levelColor = user ? (LEVEL_COLORS[user.level] ?? '#fff') : '#fff';

  return (
    <nav
      style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: '56px',
        gap: '32px',
      }}
    >
      {/* Brand */}
      <Link
        to="/workflows"
        style={{
          color: '#38bdf8',
          fontWeight: 700,
          fontSize: '18px',
          textDecoration: 'none',
          letterSpacing: '-0.5px',
        }}
      >
        ⚡ Axon Cloud
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
        {navLinks.map(({ to, label }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                color: active ? '#38bdf8' : '#94a3b8',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: active ? 600 : 400,
                background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* User info */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '12px',
              color: levelColor,
              border: `1px solid ${levelColor}`,
              borderRadius: '4px',
              padding: '2px 8px',
              fontWeight: 600,
            }}
          >
            Level {user.level}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{user.email}</span>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
