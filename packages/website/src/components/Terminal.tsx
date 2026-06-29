import { useEffect, useRef, useState } from 'react'
import './Terminal.css'

interface TerminalLine {
  text: string
  type: 'command' | 'progress' | 'rule' | 'file' | 'summary' | 'score' | 'blank' | 'header'
  delay: number
}

const LINES: TerminalLine[] = [
  { text: '$ npx remediation scan ./src', type: 'command', delay: 400 },
  { text: '', type: 'blank', delay: 200 },
  { text: '⚡ ░░░░░░░░░░░░░░░░░░░░░░░░  0/2423', type: 'progress', delay: 100 },
  { text: '⚡ ████░░░░░░░░░░░░░░░░░░░░  605/2423', type: 'progress', delay: 500 },
  { text: '⚡ ████████░░░░░░░░░░░░░░░░  1211/2423', type: 'progress', delay: 500 },
  { text: '⚡ ████████████░░░░░░░░░░░░  1817/2423', type: 'progress', delay: 500 },
  { text: '⚡ ████████████████████████  2423/2423', type: 'progress', delay: 500 },
  { text: '⚡ Scanned 2423 files in 3.4s', type: 'header', delay: 300 },
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
  { text: '  ... and 2348 more files', type: 'muted' as TerminalLine['type'], delay: 100 },
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
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([])
  const [cursor, setCursor] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.3 }
    )
    if (elementRef.current) {
      observerRef.current.observe(elementRef.current)
    }
    return () => observerRef.current?.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return

    let cancelled = false
    let index = 0

    const next = () => {
      if (cancelled || index >= LINES.length) return
      const line = LINES[index++]
      setVisibleLines(prev => [...prev, line])
      setTimeout(next, line.delay)
    }

    setTimeout(next, 300)
    return () => { cancelled = true }
  }, [started])

  useEffect(() => {
    const interval = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [visibleLines])

  return (
    <div className="terminal-wrapper" ref={elementRef}>
      <div className="terminal-chrome">
        <div className="terminal-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="terminal-title">zsh</span>
      </div>
      <div className="terminal-body" ref={containerRef}>
        {visibleLines.map((line, i) => (
          <TerminalRow
            key={i}
            line={line}
            isLast={i === visibleLines.length - 1}
            cursor={cursor}
            done={visibleLines.length >= LINES.length}
          />
        ))}
        {visibleLines.length === 0 && (
          <span className="terminal-line terminal-command">
            <span className="prompt">$ </span>
            <span className={cursor ? 'cursor-on' : 'cursor-off'}>▋</span>
          </span>
        )}
      </div>
    </div>
  )
}

function TerminalRow({
  line,
  isLast,
  cursor,
  done,
}: {
  line: TerminalLine
  isLast: boolean
  cursor: boolean
  done: boolean
}) {
  const showCursor = isLast && !done

  if (line.type === 'blank') return <div className="terminal-line" />

  return (
    <div className={`terminal-line terminal-${line.type}`}>
      {line.type === 'command' && <span className="prompt">$ </span>}
      <span dangerouslySetInnerHTML={{ __html: colorize(line.text, line.type) }} />
      {showCursor && <span className={cursor ? 'cursor-on' : 'cursor-off'}>▋</span>}
    </div>
  )
}

function colorize(text: string, type: TerminalLine['type']): string {
  if (type === 'rule') {
    return text
      .replace(/(spacing\/hardcoded|typography\/hardcoded|drift|shadows\/hardcoded|colors\/hardcoded|radius\/hardcoded)/, '<span class="tc-rule">$1</span>')
      .replace(/(\d+)\s+(█+)(░*)/, '<span class="tc-num">$1</span>  <span class="tc-bar">$2</span><span class="tc-empty">$3</span>')
  }
  if (type === 'summary') {
    return text
      .replace(/✖/, '<span class="tc-error">✖</span>')
      .replace(/⚠/, '<span class="tc-warning">⚠</span>')
      .replace(/(\d+) errors/, '<span class="tc-error">$1 errors</span>')
      .replace(/(\d+) warnings/, '<span class="tc-warning">$1 warnings</span>')
      .replace(/(████+)/, '<span class="tc-bar">$1</span>')
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
