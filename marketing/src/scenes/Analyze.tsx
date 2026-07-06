import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { C, FONT_MONO } from '../theme';
import { TerminalWindow, Box, Line } from '../components/Terminal';
import { TypedLine } from '../components/TypedLine';
import { SceneHeading } from './Scan';

const clip = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const fadeInOut = (f: number, a: number, b: number, c: number, d: number) =>
  interpolate(f, [a, b, c, d], [0, 1, 1, 0], clip);

const CLUSTERS = [
  { hex: '#2563eb', n: '5x', files: '5 files' },
  { hex: '#dc2626', n: '3x', files: '3 files' },
  { hex: '#ffffff', n: '4x', files: '4 files' },
  { hex: '#27272a', n: '3x', files: '3 files' },
];

const PROPOSALS = [
  { name: 'blue', value: '#2563eb', n: '5x', conf: C.green },
  { name: 'sm', value: '8px', n: '9x', conf: C.green },
  { name: 'md', value: '16px', n: '5x', conf: C.green },
  { name: 'red', value: '#dc2626', n: '3x', conf: C.yellow },
  { name: 'white', value: '#ffffff', n: '4x', conf: C.yellow },
];

export const Analyze: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Stage A — terminal: analyze + extraction */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: fadeInOut(f, 0, 12, 95, 120),
        }}
      >
        <TerminalWindow width={1120} title="zsh — remediation analyze">
          <TypedLine text="remediation analyze ./src" startFrame={4} fontSize={32} />
          <Extraction startFrame={44} />
        </TerminalWindow>
      </AbsoluteFill>

      {/* Stage B — clusters + token proposals dashboard. The two panels tell the
          before/after story themselves (raw clusters -> named tokens), so we don't
          restate the 284/16 counts a third time here. */}
      <Sequence from={105}>
        <Dashboard />
      </Sequence>
    </AbsoluteFill>
  );
};

const Extraction: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [startFrame, startFrame + 12], [0, 1], clip);
  return (
    <div style={{ marginTop: 24, opacity: op }}>
      <Line size={28} color={C.green}>
        ⚡ <span style={{ color: C.muted }}>Analysis complete in 1.2s</span>
      </Line>
      <Box title="─ Extraction ─" style={{ marginTop: 22, width: 640 }}>
        <Line size={28} color={C.text}>284 design values found</Line>
        <Line size={26} color={C.muted}>{'color        189'}</Line>
        <Line size={26} color={C.muted}>{'spacing       71'}</Line>
        <Line size={26} color={C.muted}>{'typography    24'}</Line>
      </Box>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, 20], [0, 1], clip);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: op }}>
      <div style={{ width: 1500 }}>
        <SceneHeading kicker="analyze · clustering → proposals" title="From drift to a token set" />
        <div style={{ display: 'flex', gap: 40, marginTop: 34 }}>
          {/* Color clusters */}
          <Box title="─ Color Clusters ─" style={{ flex: 1, background: C.surface }} accent={C.muted}>
            {CLUSTERS.map((c, i) => {
              const o = interpolate(f, [20 + i * 7, 34 + i * 7], [0, 1], clip);
              return (
                <div key={c.hex} style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18, opacity: o, fontFamily: FONT_MONO }}>
                  <span style={{ width: 34, height: 34, borderRadius: 7, background: c.hex, border: `1px solid ${C.border}` }} />
                  <span style={{ color: C.text, fontSize: 30, width: 180 }}>{c.hex}</span>
                  <span style={{ color: C.muted, fontSize: 26 }}>{c.n} · {c.files}</span>
                </div>
              );
            })}
            <div style={{ color: C.muted, fontSize: 24, marginTop: 6, fontFamily: FONT_MONO }}>… and 8 more</div>
          </Box>

          {/* Token proposals */}
          <Box title="─ Token Proposals ─" style={{ flex: 1.2, background: C.surface }} accent={C.green}>
            <div style={{ fontFamily: FONT_MONO, marginBottom: 20 }}>
              <span style={{ color: C.text, fontSize: 30 }}>16 tokens proposed</span>
              <div style={{ color: C.muted, fontSize: 24, marginTop: 10 }}>
                <span style={{ color: C.green }}>● 4 high</span>{'   '}
                <span style={{ color: C.yellow }}>● 12 medium</span>
              </div>
            </div>
            {PROPOSALS.map((p, i) => {
              const o = interpolate(f, [40 + i * 8, 55 + i * 8], [0, 1], clip);
              return (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, opacity: o, transform: `translateX(${(1 - o) * 10}px)`, fontFamily: FONT_MONO, fontSize: 28 }}>
                  <span style={{ color: p.conf }}>●</span>
                  <span style={{ color: C.green, width: 90 }}>{p.name}</span>
                  <span style={{ color: C.muted }}>=</span>
                  <span style={{ color: C.text, width: 170 }}>{p.value}</span>
                  <span style={{ color: C.muted }}>({p.n})</span>
                </div>
              );
            })}
            <div style={{ color: C.muted, fontSize: 24, marginTop: 6, fontFamily: FONT_MONO }}>… and 11 more</div>
          </Box>
        </div>
      </div>
    </AbsoluteFill>
  );
};
