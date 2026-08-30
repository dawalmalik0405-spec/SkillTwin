import React from 'react';

export const GlobalHeaderBadge: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #C084FC 0%, #38BDF8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '0.02em',
          userSelect: 'none',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid rgba(192, 132, 252, 0.25)',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)',
          cursor: 'default'
        }}
      >
        ✦ Your Career Journey
      </span>
    </div>
  );
};
