import { Terminal } from './components/Terminal'
import './App.css'

export default function App() {
  return (
    <div className="page">
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-logo">⚡ remediation</span>
          <div className="nav-links">
            <a href="https://github.com/arnaudmanaranche/remediation" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://npmjs.com/package/remediation" target="_blank" rel="noreferrer" className="nav-cta">npm</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div className="badge">CLI tool · Open source</div>
          <h1 className="hero-title">
            Stop design system drift.<br />
            <span className="hero-accent">Before it ships.</span>
          </h1>
          <p className="hero-subtitle">
            remediation scans your React codebase for hardcoded values, component duplication,
            and design token bypasses — then tells you exactly what to fix.
          </p>
          <div className="hero-actions">
            <div className="install-box">
              <code>npx remediation scan</code>
              <button className="copy-btn" onClick={() => navigator.clipboard.writeText('npx remediation scan')}>
                Copy
              </button>
            </div>
            <a
              href="https://github.com/arnaudmanaranche/remediation"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Read the docs →
            </a>
          </div>
        </div>

        <div className="hero-terminal">
          <Terminal />
        </div>
      </section>

      <section className="features">
        <div className="features-inner">
          <h2 className="section-title">Everything your design system needs to stay healthy</h2>
          <div className="feature-grid">
            <Feature
              icon="🎨"
              title="Token violations"
              body="Catches hardcoded colors, spacing, font sizes, shadows, and border-radius values that should use your design tokens."
            />
            <Feature
              icon="🔍"
              title="Drift detection"
              body="Finds near-duplicate components that diverged over time and should be merged back into a single source of truth."
            />
            <Feature
              icon="🚫"
              title="Token bypass"
              body="Flags places where a token exists but a hardcoded value is used anyway — the silent regression most linters miss."
            />
            <Feature
              icon="📄"
              title="CSS & SCSS support"
              body="Parses JSX, TSX, CSS, and SCSS via native AST — not regex. Accurate results with zero false positives from comments."
            />
            <Feature
              icon="📊"
              title="Health score"
              body="A single 0–100 number that tells you where your codebase stands. Track it over time or block CI when it drops."
            />
            <Feature
              icon="🧱"
              title="Baseline mode"
              body="Adopt remediation on a large legacy codebase without being blocked — suppress existing violations and only alert on new ones."
            />
          </div>
        </div>
      </section>

      <section className="how">
        <div className="how-inner">
          <h2 className="section-title">Simple by design</h2>
          <div className="steps">
            <Step n="1" title="Install" code="npm install -g remediation" />
            <Step n="2" title="Configure" code="remediation init" />
            <Step n="3" title="Scan" code="remediation scan ./src" />
            <Step n="4" title="Block CI on regressions" code="remediation scan --format json" />
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-inner">
          <h2>Start in 30 seconds.</h2>
          <p>No config required. Run on any React project.</p>
          <div className="install-box install-box-lg">
            <code>npx remediation scan</code>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText('npx remediation scan')}>
              Copy
            </button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <span>remediation · MIT License</span>
          <div className="footer-links">
            <a href="https://github.com/arnaudmanaranche/remediation" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://npmjs.com/package/remediation" target="_blank" rel="noreferrer">npm</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="feature-card">
      <span className="feature-icon">{icon}</span>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-body">{body}</p>
    </div>
  )
}

function Step({ n, title, code }: { n: string; title: string; code: string }) {
  return (
    <div className="step">
      <span className="step-n">{n}</span>
      <div className="step-content">
        <span className="step-title">{title}</span>
        <code className="step-code">{code}</code>
      </div>
    </div>
  )
}
