import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT_MONO } from '../theme';
import { Logo } from '../components/Logo';
import { DynamicGrid } from '../components/remocn/dynamic-grid';

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const gridOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const subOpacity = interpolate(frame, [50, 72], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ opacity: gridOpacity * 0.45 }}>
        <DynamicGrid
          cellSize={64}
          lineColor="#161616"
          background={C.bg}
          speed={0.25}
          direction="diagonal"
        />
      </AbsoluteFill>

      {/* Wordmark, centered in the upper band */}
      <div style={{ position: 'absolute', inset: 0, bottom: '20%' }}>
        <Logo fontSize={130} />
      </div>

      {/* Tagline in the lower band */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 260,
          opacity: subOpacity,
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            color: C.text,
            fontSize: 42,
            letterSpacing: 0.5,
          }}
        >
          Find &amp; fix your design system drift.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
