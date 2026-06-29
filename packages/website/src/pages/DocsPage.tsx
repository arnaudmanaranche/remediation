import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './DocsPage.css'

// ── Sidebar nav structure ────────────────────────────────────────────────────

const SIDEBAR = [
  {
    title: 'Getting started',
    items: [
      { id: 'introduction',  label: 'Introduction' },
      { id: 'installation',  label: 'Installation' },
      { id: 'quick-start',   label: 'Quick start' },
    ],
  },
  {
    title: 'Commands',
    items: [
      { id: 'cmd-scan',     label: 'scan' },
      { id: 'cmd-tokens',   label: 'tokens' },
      { id: 'cmd-analyze',  label: 'analyze' },
      { id: 'cmd-init',     label: 'init' },
    ],
  },
  {
    title: 'Rules',
    items: [
      { id: 'rule-colors',     label: 'colors/hardcoded' },
      { id: 'rule-spacing',    label: 'spacing/hardcoded' },
      { id: 'rule-typography', label: 'typography/hardcoded' },
      { id: 'rule-radius',     label: 'radius/hardcoded' },
      { id: 'rule-shadows',    label: 'shadows/hardcoded' },
      { id: 'rule-drift',      label: 'drift' },
      { id: 'rule-bypass',     label: 'token-bypass' },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'config-file',     label: 'Config file' },
      { id: 'config-ignore',   label: 'Ignore patterns' },
      { id: 'config-severity', label: 'Rule severity' },
      { id: 'config-tokens',   label: 'Token mappings' },
    ],
  },
  {
    title: 'CI / CD',
    items: [
      { id: 'ci-github',   label: 'GitHub Actions' },
      { id: 'ci-baseline', label: 'Baseline mode' },
    ],
  },
]

// ── Component ────────────────────────────────────────────────────────────────

export function DocsPage() {
  const location = useLocation()
  const [activeId, setActiveId] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)

  // Scroll to hash on load
  useEffect(() => {
    const hash = location.hash.slice(1)
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveId(hash)
      }, 80)
    }
  }, [location.hash])

  // IntersectionObserver for active TOC item
  useEffect(() => {
    const headings = contentRef.current?.querySelectorAll('h2[id], h3[id]') ?? []
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    headings.forEach(h => obs.observe(h))
    return () => obs.disconnect()
  }, [])

  const onThisPage = SIDEBAR.flatMap(s => s.items).filter(item =>
    contentRef.current?.querySelector(`#${item.id}`)
  )

  return (
    <div className="docs-layout">
      {/* Left sidebar */}
      <aside className="docs-sidebar">
        <nav className="docs-nav">
          {SIDEBAR.map(section => (
            <div key={section.title} className="docs-nav-section">
              <span className="docs-nav-title">{section.title}</span>
              {section.items.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`docs-nav-link ${activeId === item.id ? 'docs-nav-active' : ''}`}
                  onClick={e => {
                    e.preventDefault()
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    setActiveId(item.id)
                    history.replaceState(null, '', `/docs#${item.id}`)
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <article className="docs-content" ref={contentRef}>
        <DocsContent />
      </article>

      {/* Right TOC */}
      <aside className="docs-toc">
        <span className="docs-toc-title">On this page</span>
        {SIDEBAR.flatMap(s => s.items).map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`docs-toc-link ${activeId === item.id ? 'docs-toc-active' : ''}`}
            onClick={e => {
              e.preventDefault()
              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              setActiveId(item.id)
            }}
          >
            {item.label}
          </a>
        ))}
      </aside>
    </div>
  )
}

// ── Content ──────────────────────────────────────────────────────────────────

function DocsContent() {
  return (
    <>
      {/* ── Getting started ─────────────────────── */}
      <section>
        <h1 id="introduction">Introduction</h1>
        <p>
          remediation is a CLI that scans your React codebase for design system drift —
          hardcoded values that should use tokens, near-duplicate components, and places
          where a token exists but a raw value is used anyway.
        </p>
        <p>
          It returns a 0–100 health score and a full list of violations grouped by rule,
          suitable for local use and CI pipelines.
        </p>
        <p>Works with any React project: Next.js, Vite, CRA, Remix, or plain React.</p>
      </section>

      <section>
        <h2 id="installation">Installation</h2>
        <p>No installation required — run directly with npx:</p>
        <Code code="npx remediation scan" />
        <p>Or install globally:</p>
        <Code code="npm install -g remediation" />
        <p>Or add to a project:</p>
        <Code code={`npm install --save-dev remediation\n# then add to package.json scripts:\n"lint:ds": "remediation scan"`} />
      </section>

      <section>
        <h2 id="quick-start">Quick start</h2>
        <p>Scan the current directory:</p>
        <Code code="npx remediation scan" />
        <p>Scan a specific path:</p>
        <Code code="npx remediation scan ./src" />
        <p>Generate a config file interactively:</p>
        <Code code="npx remediation init" />
        <p>Run token-only rules:</p>
        <Code code="npx remediation tokens ./src" />
      </section>

      {/* ── Commands ────────────────────────────── */}
      <section>
        <h2 id="cmd-scan">scan</h2>
        <p>
          Scans the project for all rule violations. The exit code is <code>1</code> when
          any <code>error</code>-severity violation is found (use <code>rules</code> in your
          config to promote rules to <code>error</code>).
        </p>
        <Code code="remediation scan [path] [flags]" />
        <FlagTable flags={[
          ['--verbose',          'Show all violations in the terminal'],
          ['--output <file>',    'Write the full report to a file'],
          ['--rule <pattern>',   'Filter by rule name, e.g. colors, drift'],
          ['--format json',      'Output results as JSON (for CI)'],
          ['--save-baseline',    'Save current violations as baseline'],
          ['--ignore-baseline',  'Skip the baseline file even if present'],
        ]} />
      </section>

      <section>
        <h2 id="cmd-tokens">tokens</h2>
        <p>
          Shorthand for <code>scan --rule colors/,spacing/,typography/,radius/,shadows/</code>.
          Runs only the hardcoded-value rules — skips structural rules like <code>drift</code>{' '}
          and <code>token-bypass</code>.
        </p>
        <Code code="remediation tokens [path] [flags]" />
        <FlagTable flags={[
          ['--verbose',         'Show all violations in the terminal'],
          ['--output <file>',   'Write the full report to a file'],
          ['--format json',     'Output results as JSON'],
          ['--save-baseline',   'Save current violations as baseline'],
          ['--ignore-baseline', 'Skip the baseline file'],
        ]} />
      </section>

      <section>
        <h2 id="cmd-analyze">analyze</h2>
        <p>
          Runs the full analysis pipeline: extraction → normalization → clustering → token
          proposals → optional codemod. Use this to discover what tokens your codebase
          implicitly uses and generate a <code>tokens.ts</code> file.
        </p>
        <Code code="remediation analyze [path] [flags]" />
        <FlagTable flags={[
          ['--codemod',               'Preview token replacements (dry-run)'],
          ['--codemod --no-dry-run',  'Apply token replacements to files'],
          ['--output <file>',         'Generate a tokens.ts output file'],
          ['--min-confidence <level>','Filter proposals: high | medium | low'],
        ]} />
      </section>

      <section>
        <h2 id="cmd-init">init</h2>
        <p>
          Interactive wizard that creates a <code>remediation.config.js</code> in the current
          directory. Prompts for ignore patterns, rule severity overrides, and token mappings.
        </p>
        <Code code="remediation init" />
      </section>

      {/* ── Rules ───────────────────────────────── */}
      <section>
        <h2 id="rule-colors">colors/hardcoded</h2>
        <p>
          Detects hardcoded color values in JSX style props, CSS, and SCSS files.
          Catches hex (<code>#fff</code>), rgb/rgba, and hsl/hsla formats.
        </p>
        <Code code={`// ✖ flagged\n<div style={{ color: '#1976D2' }} />\n\n// ✔ ok\n<div style={{ color: colors.primary }} />`} />
      </section>

      <section>
        <h2 id="rule-spacing">spacing/hardcoded</h2>
        <p>
          Detects hardcoded spacing values: <code>px</code>, <code>rem</code>, <code>em</code>,
          and unitless numbers in margin/padding/gap/width/height properties.
        </p>
        <Code code={`// ✖ flagged\n<div style={{ padding: '16px' }} />\n\n// ✔ ok\n<div style={{ padding: spacing.md }} />`} />
      </section>

      <section>
        <h2 id="rule-typography">typography/hardcoded</h2>
        <p>
          Detects hardcoded font sizes (<code>fontSize</code>) and font weights (<code>fontWeight</code>)
          in JSX and CSS/SCSS.
        </p>
        <Code code={`// ✖ flagged\n<p style={{ fontSize: '14px', fontWeight: 600 }} />\n\n// ✔ ok\n<p style={{ fontSize: type.sm, fontWeight: type.semibold }} />`} />
      </section>

      <section>
        <h2 id="rule-radius">radius/hardcoded</h2>
        <p>
          Detects hardcoded <code>borderRadius</code> values in JSX and <code>border-radius</code>{' '}
          in CSS/SCSS.
        </p>
        <Code code={`// ✖ flagged\n<div style={{ borderRadius: '8px' }} />\n\n// ✔ ok\n<div style={{ borderRadius: radius.md }} />`} />
      </section>

      <section>
        <h2 id="rule-shadows">shadows/hardcoded</h2>
        <p>
          Detects hardcoded <code>boxShadow</code> in JSX and <code>box-shadow</code>{' '}
          in CSS/SCSS.
        </p>
        <Code code={`// ✖ flagged\n<div style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />\n\n// ✔ ok\n<div style={{ boxShadow: shadows.md }} />`} />
      </section>

      <section>
        <h2 id="rule-drift">drift</h2>
        <p>
          Detects components with similar names or near-identical JSX structure that have
          diverged over time and should be merged into a single source of truth. Uses AST
          comparison — not just string similarity.
        </p>
        <p>
          Common examples: <code>Button</code> vs <code>PrimaryButton</code>,{' '}
          <code>Card</code> vs <code>ItemCard</code>.
        </p>
      </section>

      <section>
        <h2 id="rule-bypass">token-bypass</h2>
        <p>
          Detects places where a hardcoded value is used and a matching token already exists
          in your <code>tokens</code> config. Requires the <code>tokens</code> map to be
          configured — the rule is silent otherwise.
        </p>
        <Code lang="js" code={`// remediation.config.js\nmodule.exports = {\n  tokens: {\n    '#1976D2': 'colors.primary',\n  },\n}`} />
        <Code code={`// ✖ flagged — colors.primary exists for this value\n<div style={{ color: '#1976D2' }} />`} />
      </section>

      {/* ── Configuration ───────────────────────── */}
      <section>
        <h2 id="config-file">Config file</h2>
        <p>
          Create <code>remediation.config.js</code> at the root of your project, or run{' '}
          <code>remediation init</code> for an interactive wizard.
        </p>
        <Code lang="js" code={`// remediation.config.js\nmodule.exports = {\n  ignore: [],\n  rules: {},\n  tokens: {},\n}`} />
      </section>

      <section>
        <h2 id="config-ignore">Ignore patterns</h2>
        <p>
          The <code>ignore</code> array accepts glob patterns. Files matching any pattern are
          skipped entirely.
        </p>
        <Code lang="js" code={`module.exports = {\n  ignore: [\n    '**/*.test.tsx',\n    '**/*.stories.tsx',\n    'src/legacy/**',\n  ],\n}`} />
        <p>The following directories are always ignored by default:</p>
        <p className="docs-muted">
          node_modules, dist, build, .next, .nuxt, out, coverage, .cache,
          .parcel-cache, .webpack, .turbo, .vercel, .netlify, tmp, temp
        </p>
      </section>

      <section>
        <h2 id="config-severity">Rule severity</h2>
        <p>
          Each rule can be set to <code>"error"</code>, <code>"warning"</code>,{' '}
          <code>"info"</code>, or <code>"off"</code>. Rules set to <code>"error"</code> cause
          the process to exit with code <code>1</code>.
        </p>
        <Code lang="js" code={`module.exports = {\n  rules: {\n    'colors/hardcoded':     'error',\n    'spacing/hardcoded':    'error',\n    'typography/hardcoded': 'warning',\n    'drift':                'warning',\n    'token-bypass':         'off',\n  },\n}`} />
      </section>

      <section>
        <h2 id="config-tokens">Token mappings</h2>
        <p>
          The <code>tokens</code> map powers the <code>token-bypass</code> rule. Each key is
          a raw value, each value is the token name to suggest as a replacement.
        </p>
        <Code lang="js" code={`module.exports = {\n  tokens: {\n    '#1976D2': 'colors.primary',\n    '#D32F2F': 'colors.danger',\n    '#ffffff': 'colors.white',\n    '8px':     'spacing.sm',\n    '16px':    'spacing.md',\n  },\n}`} />
      </section>

      {/* ── CI / CD ─────────────────────────────── */}
      <section>
        <h2 id="ci-github">GitHub Actions</h2>
        <p>Add a step to any workflow to block merges on design system violations:</p>
        <Code lang="yaml" code={`- name: Scan design system\n  run: npx remediation scan --format json --output report.json\n\n- name: Upload report\n  uses: actions/upload-artifact@v4\n  with:\n    name: remediation-report\n    path: report.json`} />
        <p>
          With <code>error</code>-severity rules configured, the first step exits with
          code <code>1</code> and fails the workflow. The upload step runs regardless to
          preserve the report as an artifact.
        </p>
      </section>

      <section>
        <h2 id="ci-baseline">Baseline mode</h2>
        <p>
          Adopt remediation on a large existing codebase without being blocked by legacy
          violations. Save the current state once, then only new violations are reported.
        </p>
        <Code code={`# Run once — save current violations as baseline\nnpx remediation scan --save-baseline\n\n# Commit the baseline alongside your code\ngit add .remediation-baseline.json\ngit commit -m "chore: add remediation baseline"\n\n# Future scans only report new violations\nnpx remediation scan`} />
        <p>
          To temporarily audit the full picture without the baseline, pass{' '}
          <code>--ignore-baseline</code>:
        </p>
        <Code code="npx remediation scan --ignore-baseline" />
      </section>
    </>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Code({ code, lang = 'sh' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="docs-code-block">
      <pre><code>{code}</code></pre>
      <button
        className="docs-copy"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  )
}

function FlagTable({ flags }: { flags: [string, string][] }) {
  return (
    <table className="docs-table">
      <thead>
        <tr><th>Flag</th><th>Description</th></tr>
      </thead>
      <tbody>
        {flags.map(([flag, desc]) => (
          <tr key={flag}>
            <td><code>{flag}</code></td>
            <td>{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
