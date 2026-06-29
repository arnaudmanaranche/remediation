import { useState } from 'react'
import { Routes, Route, NavLink, Link } from 'react-router-dom'
import { Terminal } from './components/Terminal'
import { DocsPage } from './pages/DocsPage'
import './App.css'

const FAQ_ITEMS = [
  {
    q: 'What is remediation?',
    a: 'remediation is a CLI that scans your React codebase for design system inconsistencies — hardcoded colors, spacing, typography, shadows, and border-radius values that should use design tokens, as well as duplicate components and token bypasses. It returns a 0–100 health score and a full list of violations grouped by rule.',
  },
  {
    q: 'Which file types are supported?',
    a: 'JSX, TSX, CSS, and SCSS. JavaScript and TypeScript files are parsed via Babel AST; CSS and SCSS files via PostCSS with the postcss-scss syntax. Comments and import statements are excluded to avoid false positives.',
  },
  {
    q: 'How does the health score work?',
    a: 'The score goes from 0 (critical) to 100 (clean). It is calculated from the ratio of violations to total scanned nodes, weighted by severity — error-level violations cost more than warnings. A score above 80 is considered good.',
  },
  {
    q: 'Can I use it in CI?',
    a: 'Yes. Configure rules with severity "error" in remediation.config.js and the process will exit with code 1 when any error-severity violation is found, blocking the pipeline. Use --save-baseline on first adoption to avoid failing on pre-existing violations.',
  },
  {
    q: 'What is baseline mode?',
    a: 'Running remediation scan --save-baseline saves all current violations to .remediation-baseline.json. Subsequent scans suppress those known violations and only report new ones introduced since the baseline was saved. Commit the baseline file so CI and teammates share the same starting point.',
  },
  {
    q: 'Can I configure which rules run and their severity?',
    a: 'Yes. Create a remediation.config.js at the project root (or run remediation init for an interactive wizard). You can set each rule to "error", "warning", "info", or "off", define ignore patterns, and provide token mappings for the token-bypass rule.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. remediation is open source under the MIT license. You can use it for free in any project, commercial or otherwise.',
  },
]

export default function App() {
  return (
    <div className="page">
      <Nav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/*" element={<DocsPage />} />
      </Routes>
    </div>
  )
}

function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="nav-logo" to="/">⚡ remediation</Link>
        <nav className="nav-links">
          <NavLink to="/docs" className={({ isActive }) => isActive ? 'nav-link-active' : ''}>
            Docs
          </NavLink>
          <a href="https://npmjs.com/package/remediation" target="_blank" rel="noreferrer">npm</a>
          <a href="https://github.com/arnaudmanaranche/remediation" target="_blank" rel="noreferrer" className="nav-github">
            <GithubIcon />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}

function HomePage() {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText('npx remediation scan')
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main>
      <section className="hero">
        <h1 className="h1">Your design tokens<br />aren't being used.</h1>
        <p className="tagline">remediation scans your React codebase and tells you exactly where.</p>
        <Terminal />
        <div className="install">
          <span className="install-prefix">$</span>
          <code className="install-cmd" data-text="npx remediation scan">
            npx remediation scan
          </code>
          <button className="copy" onClick={copy}>{copied ? '✓' : 'Copy'}</button>
        </div>
        <ul className="facts">
          <li>6 rules — colors, spacing, typography, shadows, radius, drift</li>
          <li>JSX · TSX · CSS · SCSS</li>
          <li>Baseline mode for legacy codebases</li>
          <li>Exit code 1 in CI on errors</li>
        </ul>
      </section>

      <section className="faq-section">
        <div className="faq-inner">
          <h2 className="faq-title">Frequently asked questions</h2>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item ${open ? 'faq-open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <span className="faq-chevron">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div className="faq-a-wrap">
        <p className="faq-a">{a}</p>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">⚡ remediation</span>
          <p className="footer-tagline">Design system lint for React.</p>
          <p className="footer-copy">MIT License · Open source</p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <span className="footer-col-title">Project</span>
            <a href="https://github.com/arnaudmanaranche/remediation" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://npmjs.com/package/remediation" target="_blank" rel="noreferrer">npm</a>
            <a href="https://github.com/arnaudmanaranche/remediation/releases" target="_blank" rel="noreferrer">Changelog</a>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Docs</span>
            <Link to="/docs#cmd-scan">Commands</Link>
            <Link to="/docs#rule-colors">Rules</Link>
            <Link to="/docs#config-file">Configuration</Link>
            <Link to="/docs#ci-github">CI usage</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function GithubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
