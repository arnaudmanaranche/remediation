import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT_MONO } from '../theme';
import { GlassCodeBlock } from '../components/remocn/glass-code-block';
import { SceneHeading } from './Scan';

const clip = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

const AFTER_CODE = `import { colors, spacing } from '@/design/tokens'

export function Button() {
  return (
    <button
      style={{
        color: colors.white,
        background: colors.blue,
        padding: \`\${spacing.sm} \${spacing.md}\`,
      }}
    />
  )
}`;

const CHANGES = [
  { loc: 'L14:26', from: "'#2563eb'", to: 'colors.blue' },
  { loc: 'L15:16', from: "'#ffffff'", to: 'colors.white' },
  { loc: 'L16:19', from: '8px', to: 'spacing.sm' },
  { loc: 'L16:23', from: '16px', to: 'spacing.md' },
];

export const Codemod: React.FC = () => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, 18], [0, 1], clip);
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center', opacity: op }}>
      <div style={{ width: 1620 }}>
        <SceneHeading kicker="analyze --codemod" title="Hardcoded values → token references" />
        <div style={{ display: 'flex', gap: 56, marginTop: 34, alignItems: 'center' }}>
          {/* code block (the rewritten file) */}
          <div style={{ position: 'relative', width: 820, height: 560 }}>
            <GlassCodeBlock
              code={AFTER_CODE}
              title="src/components/Button.tsx"
              width={820}
              height={560}
              fontSize={26}
              staggerFrames={1}
              glassColor="#111214"
              showLineNumbers={false}
            />
          </div>

          {/* replacement list */}
          <div style={{ flex: 1, fontFamily: FONT_MONO }}>
            <div style={{ color: C.muted, fontSize: 26, marginBottom: 24, letterSpacing: 1 }}>
              Codemod preview · Button.tsx
            </div>
            {CHANGES.map((c, i) => {
              const o = interpolate(f, [50 + i * 12, 66 + i * 12], [0, 1], clip);
              return (
                <div
                  key={c.loc}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    marginBottom: 22,
                    fontSize: 28,
                    opacity: o,
                    transform: `translateX(${(1 - o) * 14}px)`,
                  }}
                >
                  <span style={{ color: C.muted, width: 100 }}>{c.loc}</span>
                  <span style={{ color: C.red, textDecoration: 'line-through', textDecorationColor: C.muted }}>
                    {c.from}
                  </span>
                  <span style={{ color: C.green }}>→</span>
                  <span style={{ color: C.green }}>{c.to}</span>
                </div>
              );
            })}
            <div style={{ height: 1, background: C.border, margin: '18px 0 22px' }} />
            {(() => {
              const summaryStart = 50 + (CHANGES.length - 1) * 12 + 16; // right after the last row settles
              const summaryOp = interpolate(f, [summaryStart, summaryStart + 16], [0, 1], clip);
              return (
                <div style={{ opacity: summaryOp }}>
                  <div style={{ color: C.text, fontSize: 30 }}>
                    Total: <span style={{ color: C.green, fontWeight: 600 }}>57 changes</span> in 7 files
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
