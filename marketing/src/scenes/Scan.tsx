import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { C, FONT_MONO, FONT_DISPLAY } from '../theme';
import { TerminalWindow, Box, Meter, Line } from '../components/Terminal';
import { TypedLine } from '../components/TypedLine';
import { AnimatedBarChart } from '../components/remocn/animated-bar-chart';
import { RollingNumber } from '../components/remocn/rolling-number';

const RULES = [
  { name: 'colors/hardcoded', count: 237, color: C.red },
  { name: 'spacing/hardcoded', count: 102, color: C.yellow },
  { name: 'token-bypass', count: 58, color: C.purple },
  { name: 'typography/hardcoded', count: 21, color: C.blue },
  { name: 'drift', count: 4, color: C.muted },
];

/** Crossfade a stage in over [a,b] and out over [c,d] (frames relative to scene). */
const stageOpacity = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const Scan: React.FC = () => {
  const f = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Stage A — terminal: command + progress */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: stageOpacity(f, 0, 12, 105, 130),
        }}
      >
        <TerminalWindow width={1200} title="zsh — remediation scan">
          <TypedLine text="remediation scan ./src" startFrame={4} fontSize={32} />
          <Progress startFrame={40} />
        </TerminalWindow>
      </AbsoluteFill>

      {/* Stage B — violations by rule */}
      <Sequence from={125}>
        <ViolationsStage />
      </Sequence>

      {/* Stage C — health score hero */}
      <Sequence from={300} durationInFrames={130}>
        <HealthStage />
      </Sequence>
    </AbsoluteFill>
  );
};

const Progress: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [startFrame, startFrame + 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scanned = Math.round(p * 2423);
  const done = p >= 1;
  return (
    <div style={{ marginTop: 26, opacity: interpolate(f, [startFrame - 6, startFrame], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
      <Line size={30} color={C.green}>
        {'⚡ '}
        <span style={{ color: C.text }}>
          <Meter ratio={p} cells={26} color={C.green} fontSize={30} />
        </span>
        {`  ${scanned}/2423`}
      </Line>
      {done && (
        <Line size={30} color={C.green} style={{ marginTop: 10 }}>
          {'⚡ '}
          <span style={{ color: C.muted }}>Scanned 2423 files in 3.4s</span>
        </Line>
      )}
    </div>
  );
};

const ViolationsStage: React.FC = () => {
  const f = useCurrentFrame();
  const fade = stageOpacity(f, 0, 24, 130, 155);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <div style={{ width: 1400 }}>
        <SceneHeading kicker="scan" title="Violations by rule" />
        <div style={{ display: 'flex', gap: 48, marginTop: 24, alignItems: 'center' }}>
          {/* chart */}
          <div style={{ position: 'relative', width: 760, height: 460 }}>
            <AnimatedBarChart
              width={760}
              height={460}
              data={RULES.map((r) => r.count)}
              labels={RULES.map((r) => r.name.replace('/hardcoded', ''))}
              barColor={C.red}
              gap={26}
              staggerFrames={7}
            />
          </div>
          {/* legend / counts */}
          <div style={{ flex: 1, fontFamily: FONT_MONO }}>
            {RULES.map((r, i) => {
              const op = interpolate(f, [30 + i * 8, 45 + i * 8], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div
                  key={r.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    opacity: op,
                    transform: `translateX(${(1 - op) * 12}px)`,
                    marginBottom: 18,
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: r.color }} />
                  <span style={{ color: C.text, fontSize: 26, width: 300 }}>{r.name}</span>
                  <span style={{ color: r.color, fontSize: 26, fontWeight: 600, width: 70, textAlign: 'right' }}>
                    {r.count}
                  </span>
                </div>
              );
            })}
            <div style={{ height: 1, background: C.border, margin: '10px 0 20px' }} />
            <div style={{ display: 'flex', gap: 34, fontSize: 26 }}>
              <span style={{ color: C.red }}>✖ 237 errors</span>
              <span style={{ color: C.yellow }}>⚠ 185 warnings</span>
            </div>
            <div style={{ color: C.muted, fontSize: 24, marginTop: 14 }}>
              422 total · 45 files affected
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const HealthStage: React.FC = () => {
  const f = useCurrentFrame();
  const in_ = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const out = interpolate(f, [95, 130], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const meter = interpolate(f, [10, 55], [0, 0.18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', opacity: in_ * out, background: C.bg }}
    >
      <SceneHeading kicker="health score" title="" />
      <div style={{ position: 'relative', width: 520, height: 220, marginTop: 30 }}>
        <RollingNumber from={0} to={18} fontSize={200} color={C.red} speed={2} />
      </div>
      <div style={{ fontFamily: FONT_MONO, color: C.muted, fontSize: 44, marginTop: 10 }}>
        <span style={{ color: C.red, fontWeight: 700 }}>18</span> / 100
      </div>
      <div style={{ marginTop: 30 }}>
        <Meter ratio={meter} cells={30} color={C.red} fontSize={36} />
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          color: C.red,
          fontSize: 40,
          letterSpacing: 2,
          marginTop: 22,
          textTransform: 'uppercase',
        }}
      >
        Critical
      </div>
    </AbsoluteFill>
  );
};

export const SceneHeading: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => (
  <div style={{ textAlign: 'center', marginBottom: title ? 8 : 0 }}>
    <div
      style={{
        fontFamily: FONT_MONO,
        color: C.green,
        fontSize: 24,
        letterSpacing: 4,
        textTransform: 'uppercase',
      }}
    >
      {kicker}
    </div>
    {title && (
      <div style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 56, fontWeight: 600, marginTop: 6 }}>
        {title}
      </div>
    )}
  </div>
);
