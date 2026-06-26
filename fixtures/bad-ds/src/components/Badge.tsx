import React from 'react';

type Variant = 'success' | 'danger' | 'warning' | 'info';

const VARIANT_COLORS: Record<Variant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#16a34a' },   // token-bypass: colors.success
  danger:  { bg: '#fee2e2', text: '#dc2626' },   // token-bypass: colors.danger + colors.dangerLight
  warning: { bg: '#fef3c7', text: '#f59e0b' },   // token-bypass: colors.warning
  info:    { bg: '#dbeafe', text: '#2563eb' },   // token-bypass: colors.primary
};

export function Badge({ variant, label }: { variant: Variant; label: string }) {
  const { bg, text } = VARIANT_COLORS[variant];

  return (
    <span
      style={{
        backgroundColor: bg,
        color: text,
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}
