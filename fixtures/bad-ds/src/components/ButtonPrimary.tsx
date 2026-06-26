import React from 'react';

// Drift candidate: near-duplicate of Button
export function ButtonPrimary({ label, onPress, isDisabled }: {
  label: string;
  onPress?: () => void;
  isDisabled?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      disabled={isDisabled}
      style={{
        backgroundColor: '#2563eb',   // token-bypass: colors.primary
        color: '#ffffff',             // token-bypass: colors.white
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 600,
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
