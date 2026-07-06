import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, FONT_MONO, FPS } from '../theme';

/** A left-aligned terminal command line that types out char-by-char with a caret. */
export const TypedLine: React.FC<{
  text: string;
  startFrame?: number;
  charsPerSecond?: number;
  fontSize?: number;
  prompt?: string;
  promptColor?: string;
  color?: string;
  showCaret?: boolean;
}> = ({
  text,
  startFrame = 0,
  charsPerSecond = 26,
  fontSize = 34,
  prompt = '$',
  promptColor = C.green,
  color = C.text,
  showCaret = true,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const shown = Math.min(text.length, Math.floor((elapsed / FPS) * charsPerSecond));
  const done = shown >= text.length;
  const caretOn = Math.floor(frame / 15) % 2 === 0;

  return (
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize,
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        whiteSpace: 'pre',
      }}
    >
      <span style={{ color: promptColor }}>{prompt}</span>
      <span style={{ color }}>
        {text.slice(0, shown)}
        {showCaret && (!done || caretOn) && (
          <span
            style={{
              display: 'inline-block',
              width: fontSize * 0.55,
              height: fontSize * 1.05,
              background: caretOn ? C.green : 'transparent',
              transform: 'translateY(3px)',
              marginLeft: 2,
            }}
          />
        )}
      </span>
    </div>
  );
};
