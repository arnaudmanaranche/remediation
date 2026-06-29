import { useEffect, useRef, useState } from 'react'
import './Terminal.css'

type LineType = 'command' | 'progress' | 'rule' | 'file' | 'summary' | 'score' | 'blank' | 'header' | 'muted'

interface TerminalLine {
  text: string
  type: LineType
  delay: number
  replacesPrev?: boolean  // true = overwrite the previous line in place
}

const STEPS: TerminalLine[] = [
  { text: 'npx remediation scan ./src', type: 'command', delay: 400 },
  { text: '', type: 'blank', delay: 200 },
  { text: '⚡ ░░░░░░░░░░░░░░░░░░░░░░░░  0/2423', type: 'progress', delay: 100 },
  { text: '⚡ ████░░░░░░░░░░░░░░░░░░░░  605/2423', type: 'progress', delay: 500, replacesPrev: true },
  { text: '⚡ ████████░░░░░░░░░░░░░░░░  1211/2423', type: 'progress', delay: 500, replacesPrev: true },
  { text: '⚡ ████████████░░░░░░░░░░░░  1817/2423', type: 'progress', delay: 500, replacesPrev: true },
  { text: '⚡ ████████████████████████  2423/2423', type: 'progress', delay: 500, replacesPrev: true },
  { text: '⚡ Scanned 2423 files in 3.4s', type: 'header', delay: 300, replacesPrev: true },
  { text: '', type: 'blank', delay: 100 },
  { text: 'Violations by rule:', type: 'header', delay: 200 },
  { text: '  spacing/hardcoded         3788  ████████████████  721 files', type: 'rule', delay: 150 },
  { text: '  typography/hardcoded      1640  ██████░░░░░░░░░░  408 files', type: 'rule', delay: 150 },
  { text: '  drift                      523  ██░░░░░░░░░░░░░░  134 files', type: 'rule', delay: 150 },
  { text: '  shadows/hardcoded          226  █░░░░░░░░░░░░░░░   89 files', type: 'rule', delay: 150 },
  { text: '  colors/hardcoded           204  █░░░░░░░░░░░░░░░   67 files', type: 'rule', delay: 150 },
  { text: '  radius/hardcoded           169  █░░░░░░░░░░░░░░░   54 files', type: 'rule', delay: 150 },
  { text: '', type: 'blank', delay: 100 },
  { text: 'Top affected files:', type: 'header', delay: 200 },
  { text: '   47  src/components/Button.tsx', type: 'file', delay: 80 },
  { text: '   31  src/pages/Dashboard.tsx', type: 'file', delay: 80 },
  { text: '   28  src/components/Card.tsx', type: 'file', delay: 80 },
  { text: '   21  src/components/Badge.tsx', type: 'file', delay: 80 },
  { text: '   18  src/components/Text.tsx', type: 'file', delay: 80 },
  { text: '  ... and 2348 more files', type: 'muted', delay: 100 },
  { text: '', type: 'blank', delay: 150 },
  { text: '┌─ Summary ──────────────────────────────────┐', type: 'summary', delay: 100 },
  { text: '│  ✖  5238 errors    ████████████████        │', type: 'summary', delay: 80 },
  { text: '│  ⚠  1312 warnings  ████████░░░░░░░░        │', type: 'summary', delay: 80 },
  { text: '│  ──────────────────────────────────────    │', type: 'summary', delay: 50 },
  { text: '│  6550 total violations                     │', type: 'summary', delay: 80 },
  { text: '│  2353 files affected                       │', type: 'summary', delay: 80 },
  { text: '└────────────────────────────────────────────┘', type: 'summary', delay: 100 },
  { text: '', type: 'blank', delay: 100 },
  { text: '┌─ Health Score ──────────────────────────────┐', type: 'score', delay: 100 },
  { text: '│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0/100  │', type: 'score', delay: 80 },
  { text: '│  Critical                                   │', type: 'score', delay: 80 },
  { text: '└────────────────────────────────────────────┘', type: 'score', delay: 100 },
]

export function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [cursor, setCursor] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Animate on mount
  useEffect(() => {
    let cancelled = false
    let i = 0

    const tick = () => {
      if (cancelled || i >= STEPS.length) return
      const step = STEPS[i++]
      setLines(prev => {
        if (step.replacesPrev && prev.length > 0) {
          return [...prev.slice(0, -1), step]
        }
        return [...prev, step]
      })
      setTimeout(tick, step.delay)
    }

    const t = setTimeout(tick, 600)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  // Blink
  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [lines])

  const done = lines.length >= STEPS.length

  return (
    <div className="terminal-wrapper">
      <div className="terminal-chrome">
        <div className="terminal-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="terminal-title">zsh</span>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {lines.length === 0 && (
          <div className="terminal-line terminal-command">
            <span className="prompt">$ </span>
            <span className={cursor ? 'cursor-on' : 'cursor-off'}>▋</span>
          </div>
        )}
        {lines.map((line, i) => {
          const isLast = i === lines.length - 1
          if (line.type === 'blank') return <div key={i} className="terminal-line" />
          return (
            <div key={i} className={`terminal-line terminal-${line.type}`}>
              {line.type === 'command' && <span className="prompt">$ </span>}
              <span dangerouslySetInnerHTML={{ __html: colorize(line.text, line.type) }} />
              {isLast && !done && <span className={cursor ? 'cursor-on' : 'cursor-off'}>▋</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function colorize(text: string, type: LineType): string {
  if (type === 'progress') {
    return text
      .replace(/(█+)(░*)/, '<span class="tc-bar">$1</span><span class="tc-empty">$2</span>')
      .replace(/(\d+\/\d+)/, '<span class="tc-num">$1</span>')
  }
  if (type === 'rule') {
    return text
      .replace(/(spacing\/hardcoded|typography\/hardcoded|drift|shadows\/hardcoded|colors\/hardcoded|radius\/hardcoded)/, '<span class="tc-rule">$1</span>')
      .replace(/(\d+)\s+(█+)(░*)/, '<span class="tc-num">$1</span>  <span class="tc-bar">$2</span><span class="tc-empty">$3</span>')
  }
  if (type === 'summary') {
    return text
      .replace(/✖/, '<span class="tc-error">✖</span>')
      .replace(/⚠/, '<span class="tc-warning">⚠</span>')
      .replace(/(\d+ errors)/, '<span class="tc-error">$1</span>')
      .replace(/(\d+ warnings)/, '<span class="tc-warning">$1</span>')
      .replace(/(█+)(░*)/, '<span class="tc-bar">$1</span><span class="tc-empty">$2</span>')
  }
  if (type === 'score') {
    return text
      .replace(/(░+)/, '<span class="tc-empty">$1</span>')
      .replace(/Critical/, '<span class="tc-error">Critical</span>')
      .replace(/(\d+\/100)/, '<span class="tc-num">$1</span>')
  }
  if (type === 'file') {
    return text.replace(/(\d+)\s+(.+)/, '<span class="tc-num">$1</span>  <span class="tc-file">$2</span>')
  }
  if (type === 'header') {
    return `<span class="tc-header">${text}</span>`
  }
  return text
}
