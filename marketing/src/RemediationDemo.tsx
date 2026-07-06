import React from 'react';
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT_DISPLAY, FONT_MONO, FPS, SCENES, TOTAL_FRAMES } from './theme';
import { Intro } from './scenes/Intro';
import { Scan } from './scenes/Scan';
import { Analyze } from './scenes/Analyze';
import { Codemod } from './scenes/Codemod';
import { Outro } from './scenes/Outro';

export const DEMO = {
  fps: FPS,
  durationInFrames: TOTAL_FRAMES,
};

/** Fades a scene in over its first `edge` frames and out over its last `edge`. */
const FadeWrapper: React.FC<{ edge?: number; children: React.ReactNode }> = ({
  edge = 12,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, edge, durationInFrames - edge, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const RemediationDemo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        // Make remocn components that reference these CSS vars use the brand fonts.
        ['--font-geist-sans' as string]: FONT_DISPLAY,
        ['--font-geist-mono' as string]: FONT_MONO,
      }}
    >
      <Sequence from={SCENES.intro.from} durationInFrames={SCENES.intro.duration}>
        <FadeWrapper>
          <Intro />
        </FadeWrapper>
      </Sequence>

      <Sequence from={SCENES.scan.from} durationInFrames={SCENES.scan.duration}>
        <FadeWrapper>
          <Scan />
        </FadeWrapper>
      </Sequence>

      <Sequence from={SCENES.analyze.from} durationInFrames={SCENES.analyze.duration}>
        <FadeWrapper>
          <Analyze />
        </FadeWrapper>
      </Sequence>

      <Sequence from={SCENES.codemod.from} durationInFrames={SCENES.codemod.duration}>
        <FadeWrapper>
          <Codemod />
        </FadeWrapper>
      </Sequence>

      <Sequence from={SCENES.outro.from} durationInFrames={SCENES.outro.duration}>
        <FadeWrapper>
          <Outro />
        </FadeWrapper>
      </Sequence>
    </AbsoluteFill>
  );
};
