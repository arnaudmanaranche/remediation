import React from 'react';

// Another near-duplicate of Badge (drift candidate)
export function Alert({ type, message }: { type: 'error' | 'success' | 'info'; message: string }) {
  const colors = {
    error:   { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
    success: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
    info:    { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  };

  const { bg, text, border } = colors[type];

  return (
    <div
      style={{
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        padding: '12px 16px',
        borderRadius: '6px',
        fontSize: '14px',
      }}
    >
      {message}
    </div>
  );
}
