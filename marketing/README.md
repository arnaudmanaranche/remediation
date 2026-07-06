# marketing — remediation demo video

A ~60s [Remotion](https://remotion.dev) video that demonstrates the `remediation`
CLI end-to-end. Animated UI flourishes come from
[remocn](https://www.remocn.dev) components (installed via `shadcn` into
`src/components/remocn/`).

**Isolated from the monorepo:** this folder is *not* part of the pnpm workspace
(`packages/*` only) or `knip`, and it uses its own `npm` lockfile. It is never
published.

## Setup

```bash
cd marketing
npm install
```

## Preview (interactive studio)

```bash
npm run dev        # opens Remotion Studio at localhost:3000
```

## Render

```bash
npm run build      # -> out/remediation-demo.mp4  (1920x1080, 30fps, ~60s)
npm run still      # -> out/still.png  (single frame)
```

## Structure

- `src/theme.ts` — brand palette + fonts (mirrors `packages/website/src/index.css`)
  and the master scene timeline (`SCENES`).
- `src/RemediationDemo.tsx` — composes the five scenes with cross-fades.
- `src/scenes/` — `Intro` · `Scan` · `Analyze` · `Codemod` · `Outro`.
- `src/components/Terminal.tsx` — reusable terminal-window chrome + `┌─ … ─┐`
  boxes + `█░` meters, styled to match the real CLI output.
- `src/components/TypedLine.tsx` — left-aligned terminal command typewriter.
- `src/components/remocn/` — vendored remocn components (`soft-blur-in`,
  `rolling-number`, `animated-bar-chart`, `glass-code-block`, `typewriter`,
  `dynamic-grid`, `fade-through`, `confetti`).

### Adding more remocn components

```bash
pnpm dlx shadcn@latest add @remocn/<name>
```

Browse the catalogue at https://www.remocn.dev. The `@remocn` registry is
configured in `components.json`.
