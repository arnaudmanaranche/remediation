import { loadFont as loadMono } from '@remotion/google-fonts/GeistMono';
import { loadFont as loadDisplay } from '@remotion/google-fonts/RedHatDisplay';

const mono = loadMono();
const display = loadDisplay();

/** remediation brand palette — mirrors packages/website/src/index.css */
export const C = {
  bg: '#0a0a0a',
  surface: '#111111',
  border: '#222222',
  borderSoft: '#1a1a1a',
  text: '#e8e8e8',
  muted: '#666666',
  accent: '#f0f0f0',
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
  blue: '#60a5fa',
  purple: '#a78bfa',
} as const;

export const FONT_MONO = mono.fontFamily;
export const FONT_DISPLAY = display.fontFamily;

export const FPS = 30;

/** Scene layout on the master timeline (in frames @ 30fps). Total = 1280 (~42.7s). */
export const SCENES = {
  intro: { from: 0, duration: 150 }, //  0.0 – 5.0s
  scan: { from: 150, duration: 440 }, //  5.0 – 19.7s
  analyze: { from: 590, duration: 260 }, // 19.7 – 28.3s
  codemod: { from: 850, duration: 190 }, // 28.3 – 34.7s
  outro: { from: 1040, duration: 240 }, // 34.7 – 42.7s
} as const;

export const TOTAL_FRAMES = 1280;
