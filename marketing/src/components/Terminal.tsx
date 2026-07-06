import React from 'react';
import { C, FONT_MONO } from '../theme';

/** Outer terminal window chrome: title bar with traffic lights + a mono body. */
export const TerminalWindow: React.FC<{
  title?: string;
  width?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ title = 'zsh — remediation', width = 1200, children, style }) => {
  return (
    <div
      style={{
        width,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
        fontFamily: FONT_MONO,
        ...style,
      }}
    >
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
          borderBottom: `1px solid ${C.borderSoft}`,
          background: '#0d0d0d',
        }}
      >
        <Dot color="#ff5f57" />
        <Dot color="#febc2e" />
        <Dot color="#28c840" />
        <span
          style={{
            marginLeft: 12,
            color: C.muted,
            fontSize: 18,
            letterSpacing: 0.2,
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ padding: '28px 34px' }}>{children}</div>
    </div>
  );
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span
    style={{
      width: 13,
      height: 13,
      borderRadius: '50%',
      background: color,
      display: 'inline-block',
    }}
  />
);

/** A labeled section frame, echoing the CLI's ┌─ title ─┐ boxes. */
export const Box: React.FC<{
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: string;
}> = ({ title, children, style, accent = C.muted }) => (
  <div
    style={{
      position: 'relative',
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: '30px 26px 24px',
      ...style,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: -13,
        left: 20,
        background: C.surface,
        padding: '0 10px',
        color: accent,
        fontSize: 20,
        fontFamily: FONT_MONO,
        letterSpacing: 0.5,
      }}
    >
      {title}
    </span>
    {children}
  </div>
);

/** A block-char meter, e.g. ████████░░░░░░ — matches the CLI's bars. */
export const Meter: React.FC<{
  ratio: number; // 0..1
  cells?: number;
  color?: string;
  emptyColor?: string;
  fontSize?: number;
}> = ({ ratio, cells = 28, color = C.text, emptyColor = C.border, fontSize = 26 }) => {
  const filled = Math.max(0, Math.min(cells, Math.round(ratio * cells)));
  return (
    <span style={{ fontSize, letterSpacing: -1 }}>
      <span style={{ color }}>{'█'.repeat(filled)}</span>
      <span style={{ color: emptyColor }}>{'░'.repeat(cells - filled)}</span>
    </span>
  );
};

export const Line: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, color = C.text, size = 24, style }) => (
  <div
    style={{
      color,
      fontSize: size,
      lineHeight: 1.7,
      whiteSpace: 'pre',
      ...style,
    }}
  >
    {children}
  </div>
);
