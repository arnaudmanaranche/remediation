import React from 'react';

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#000000', lineHeight: '32px' }}>
      {children}
    </h1>
  );
}

export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p style={{ fontSize: '14px', color: muted ? '#71717a' : '#27272a', lineHeight: '20px' }}>
      {children}
    </p>
  );
}

export function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '12px', color: '#71717a' }}>
      {children}
    </span>
  );
}
