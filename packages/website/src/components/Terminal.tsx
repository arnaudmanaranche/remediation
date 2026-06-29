import { useEffect, useRef, useState } from 'react'
import './Terminal.css'

// All content is rendered at once; CSS animation-delay staggers the reveal.
// This means no React re-renders driving the animation — pure GPU CSS.

interface Line {
  el: React.ReactNode
  delay: number  // seconds
}

function buildLines(): Line[] {
  let t = 0.5  // start offset in seconds
  const lines: Line[] = []

  const push = (el: React.ReactNode, gap = 0.14) => {
    lines.push({ el, delay: t })
    t += gap
  }
  const blank = (gap = 0.08) => {
    lines.push({ el: null, delay: t })
    t += gap
  }

  push(
    <span>
      <span className="t-prompt">$ </span>
      <span className="t-cmd">npx remediation scan ./src</span>
    </span>,
    0.18
  )
  blank(0.12)

  // Progress bar — CSS-animated fill
  push(
    <ProgressLine />,
    0.05
  )
  blank(0.1)

  push(<span className="t-dim">Violations by rule:</span>, 0.14)
  push(<RuleLine name="spacing/hardcoded"    count={3788} bar={16} empty={0}  files={721} />, 0.13)
  push(<RuleLine name="typography/hardcoded" count={1640} bar={7}  empty={9}  files={408} />, 0.13)
  push(<RuleLine name="drift"                count={523}  bar={2}  empty={14} files={134} />, 0.13)
  push(<RuleLine name="shadows/hardcoded"    count={226}  bar={1}  empty={15} files={89}  />, 0.13)
  push(<RuleLine name="colors/hardcoded"     count={204}  bar={1}  empty={15} files={67}  />, 0.13)
  push(<RuleLine name="radius/hardcoded"     count={169}  bar={1}  empty={15} files={54}  />, 0.13)
  blank(0.12)

  push(<span className="t-dim">Top affected files:</span>, 0.14)
  push(<FileLine n={47} f="src/components/Button.tsx" />, 0.08)
  push(<FileLine n={31} f="src/pages/Dashboard.tsx"  />, 0.08)
  push(<FileLine n={28} f="src/components/Card.tsx"  />, 0.08)
  push(<FileLine n={21} f="src/components/Badge.tsx" />, 0.08)
  push(<FileLine n={18} f="src/components/Text.tsx"  />, 0.08)
  push(<span className="t-muted">  ... and 2348 more files</span>, 0.14)
  blank(0.12)

  push(<span className="t-border">┌─ Summary ──────────────────────────────────┐</span>, 0.08)
  push(
    <span>
      <span className="t-border">│  </span>
      <span className="t-error">✖  5238 errors</span>
      <span className="t-border">    </span>
      <span className="t-bar">████████████████</span>
      <span className="t-border">        │</span>
    </span>, 0.07
  )
  push(
    <span>
      <span className="t-border">│  </span>
      <span className="t-warning">⚠  1312 warnings</span>
      <span className="t-border">  </span>
      <span className="t-bar">████████</span>
      <span className="t-empty">░░░░░░░░</span>
      <span className="t-border">        │</span>
    </span>, 0.07
  )
  push(<span className="t-border">│  ──────────────────────────────────────    │</span>, 0.05)
  push(
    <span>
      <span className="t-border">│  </span>
      <span className="t-dim">6550 total violations</span>
      <span className="t-border">                     │</span>
    </span>, 0.07
  )
  push(
    <span>
      <span className="t-border">│  </span>
      <span className="t-dim">2353 files affected</span>
      <span className="t-border">                       │</span>
    </span>, 0.07
  )
  push(<span className="t-border">└────────────────────────────────────────────┘</span>, 0.12)
  blank(0.1)

  push(<span className="t-border">┌─ Health Score ─────────────────────────────┐</span>, 0.08)
  push(
    <span>
      <span className="t-border">│  </span>
      <span className="t-empty">░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░</span>
      <span className="t-border">  </span>
      <span className="t-num">0/100</span>
      <span className="t-border">  │</span>
    </span>, 0.07
  )
  push(
    <span>
      <span className="t-border">│  </span>
      <span className="t-error">Critical</span>
      <span className="t-border">                                   │</span>
    </span>, 0.07
  )
  push(<span className="t-border">└────────────────────────────────────────────┘</span>, 0)

  return lines
}

export function Terminal() {
  const LINES = useRef(buildLines()).current

  return (
    <div className="terminal-wrapper">
      <div className="terminal-chrome">
        <div className="terminal-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="terminal-tabs">
          <span className="terminal-tab">zsh</span>
        </div>
      </div>
      <div className="terminal-body">
        {LINES.map((line, i) =>
          line.el === null
            ? <span key={i} className="t-blank" style={{ animationDelay: `${line.delay}s` }} />
            : (
              <span key={i} className="t-line" style={{ animationDelay: `${line.delay}s` }}>
                {line.el}
              </span>
            )
        )}
        <Cursor delay={LINES[LINES.length - 1].delay + 0.15} />
      </div>
    </div>
  )
}

function Cursor({ delay }: { delay: number }) {
  return (
    <span
      className="t-line"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="t-prompt">$ </span>
      <span className="t-cursor" />
    </span>
  )
}

function ProgressLine() {
  const [count, setCount] = useState(0)
  const target = 2423
  const startRef = useRef<number | null>(null)
  const duration = 2200

  useEffect(() => {
    const t = setTimeout(() => {
      const raf = (ts: number) => {
        if (startRef.current === null) startRef.current = ts
        const progress = Math.min((ts - startRef.current) / duration, 1)
        setCount(Math.floor(progress * target))
        if (progress < 1) requestAnimationFrame(raf)
        else setCount(target)
      }
      requestAnimationFrame(raf)
    }, 700)
    return () => clearTimeout(t)
  }, [])

  const filled = Math.round((count / target) * 24)
  const empty  = 24 - filled

  return (
    <span>
      <span className="t-dim">⚡ </span>
      <span className="t-bar">{'█'.repeat(filled)}</span>
      <span className="t-empty">{'░'.repeat(empty)}</span>
      <span className="t-dim">  {count.toLocaleString()}/{target.toLocaleString()}</span>
    </span>
  )
}

function RuleLine({ name, count, bar, empty, files }: {
  name: string; count: number; bar: number; empty: number; files: number
}) {
  return (
    <span>
      {'  '}
      <span className="t-rule">{name.padEnd(26)}</span>
      <span className="t-num">{String(count).padStart(4)}</span>
      {'  '}
      <span className="t-bar">{'█'.repeat(bar)}</span>
      <span className="t-empty">{'░'.repeat(empty)}</span>
      {'  '}
      <span className="t-dim">{String(files).padStart(3)} files</span>
    </span>
  )
}

function FileLine({ n, f }: { n: number; f: string }) {
  return (
    <span>
      {'  '}
      <span className="t-num">{String(n).padStart(4)}</span>
      {'  '}
      <span className="t-file">{f}</span>
    </span>
  )
}
