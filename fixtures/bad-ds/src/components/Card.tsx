import React from 'react';

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',           // token-bypass: colors.white
        border: '1px solid #e4e4e7',          // token-bypass: colors.gray200
        borderRadius: '8px',
        padding: '24px',                       // hardcoded
        marginBottom: '16px',                  // hardcoded
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',  // hardcoded shadow
      }}
    >
      <h2 style={{ color: '#27272a', fontSize: '18px', marginBottom: '12px' }}>
        {title}
      </h2>
      <div style={{ color: '#71717a' }}>
        {children}
      </div>
    </div>
  );
}
