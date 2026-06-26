import React from 'react';

// Primary action button
export function Button({ children, onClick, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: '#2563eb',   // token-bypass: should be colors.primary
        color: '#ffffff',              // token-bypass: should be colors.white
        padding: '8px 16px',          // hardcoded spacing
        borderRadius: '6px',          // hardcoded radius
        fontSize: '14px',             // hardcoded typography
        fontWeight: 600,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
