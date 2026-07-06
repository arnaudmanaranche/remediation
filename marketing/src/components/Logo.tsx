import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT_MONO } from '../theme';

/**
 * The real remediation wordmark — "[rem]ediation" in Geist Mono, "[rem]" in
 * brand green (see packages/website/src/App.tsx .nav-logo / .logo-rem).
 * Per-character blur-in reveal, same timing curve as remocn's soft-blur-in.
 */
export const Logo: React.FC<{
  fontSize?: number;
  blur?: number;
  speed?: number;
}> = ({ fontSize = 120, blur = 12, speed = 1 }) => {
  const frame = useCurrentFrame() * speed;
  const text = '[rem]ediation';
  const chars = Array.from(text);
  const charDurationFrames = 27;
  const staggerFrames = 1;
  const greenCount = 5; // "[rem]"

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize,
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        {chars.map((char, i) => {
          const local = frame - i * staggerFrames;
          const easing = Easing.bezier(0.22, 1, 0.36, 1);
          const opacity = interpolate(local, [0, charDurationFrames], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing,
          });
          const y = interpolate(local, [0, charDurationFrames], [16, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing,
          });
          const blurAmount = interpolate(local, [0, charDurationFrames], [blur, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing,
          });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                whiteSpace: 'pre',
                color: i < greenCount ? C.green : C.text,
                opacity,
                transform: `translateY(${y}px)`,
                filter: `blur(${blurAmount}px)`,
              }}
            >
              {char}
            </span>
          );
        })}
      </span>
    </div>
  );
};
