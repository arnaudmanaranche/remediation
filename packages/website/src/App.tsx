import { useState } from 'react'
import { Terminal } from './components/Terminal'
import './App.css'

export default function App() {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText('npx remediation scan')
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="page">
      <header className="header">
        <span className="logo">⚡ remediation</span>
        <a
          href="https://github.com/arnaudmanaranche/remediation"
          target="_blank"
          rel="noreferrer"
          className="github-link"
        >
          GitHub
        </a>
      </header>

      <main className="main">
        <p className="tagline">Detects design system drift in your React codebase.</p>

        <Terminal />

        <div className="install">
          <span className="install-prefix">$</span>
          <code className="install-cmd" data-text="npx remediation scan">
            npx remediation scan
          </code>
          <button className="copy" onClick={copy}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        <ul className="facts">
          <li>6 rules — colors, spacing, typography, shadows, radius, drift</li>
          <li>JSX · TSX · CSS · SCSS</li>
          <li>Baseline mode for legacy codebases</li>
          <li>Exit code 1 in CI on errors</li>
        </ul>
      </main>

      <footer className="footer">
        <a href="https://github.com/arnaudmanaranche/remediation" target="_blank" rel="noreferrer">GitHub</a>
        <span>·</span>
        <a href="https://npmjs.com/package/remediation" target="_blank" rel="noreferrer">npm</a>
        <span>·</span>
        <span>MIT</span>
      </footer>
    </div>
  )
}
