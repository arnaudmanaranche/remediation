import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT_MONO } from '../theme';
import { RollingNumber } from '../components/remocn/rolling-number';
import { Confetti } from '../components/remocn/confetti';
import { Meter } from '../components/Terminal';
import { TypedLine } from '../components/TypedLine';

const clip = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const fadeInOut = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], clip);

export const Outro: React.FC = () => {
  const f = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* restrained confetti when the score lands — settled well before the CTA takes over */}
      <Confetti
        particleCount={90}
        startFrame={70}
        lifetime={40}
        originX={0.5}
        originY={0.42}
        power={13}
        colors={[C.green, C.blue, C.yellow, C.accent]}
        seed={7}
      />

      {/* Stage A — the score payoff */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: fadeInOut(f, 0, 15, 95, 120),
        }}
      >
        <div
          style={{
            fontFamily: FONT_MONO,
            color: C.green,
            fontSize: 24,
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          potential after fixes
        </div>

        <div style={{ position: 'relative', width: 560, height: 220 }}>
          <RollingNumber from={18} to={41} fontSize={200} color={C.green} speed={2} />
        </div>
        <div style={{ fontFamily: FONT_MONO, color: C.muted, fontSize: 44, marginTop: 6 }}>
          <span style={{ color: C.green, fontWeight: 700 }}>41</span> / 100
        </div>
        <div style={{ marginTop: 26 }}>
          <Meter ratio={interpolate(f, [10, 70], [0.18, 0.41], clip)} cells={30} color={C.green} fontSize={36} />
        </div>
      </AbsoluteFill>

      {/* Stage B — the CTA takes the score's place as the sole focus */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: interpolate(f, [105, 130], [0, 1], clip),
        }}
      >
        <TypedLine text="npm i -g remediation" startFrame={115} fontSize={52} prompt="$" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
