import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import './DocsPage.css'

// ── Nav structure — each entry is its own routed page ────────────────────────

const SECTIONS = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    items: [
      { id: 'introduction',  label: 'Introduction' },
      { id: 'installation',  label: 'Installation' },
      { id: 'quick-start',   label: 'Quick start' },
      { id: 'getting-agents', label: 'Install for coding agents' },
    ],
  },
  {
    slug: 'commands',
    title: 'Commands',
    items: [
      { id: 'cmd-scan',     label: 'scan' },
      { id: 'cmd-tokens',   label: 'tokens' },
      { id: 'cmd-analyze',  label: 'analyze' },
      { id: 'cmd-init',     label: 'init' },
    ],
  },
  {
    slug: 'rules',
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
    slug: 'configuration',
    title: 'Configuration',
    items: [
      { id: 'config-file',     label: 'Config file' },
      { id: 'config-ignore',   label: 'Ignore patterns' },
      { id: 'config-severity', label: 'Rule severity' },
      { id: 'config-tokens',   label: 'Token mappings' },
      { id: 'config-tokens-import', label: 'Token import' },
    ],
  },
  {
    slug: 'ci-cd',
    title: 'CI / CD',
    items: [
      { id: 'ci-github',   label: 'GitHub Actions' },
      { id: 'ci-baseline', label: 'Baseline mode' },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy',
    items: [
      { id: 'telemetry', label: 'Telemetry' },
    ],
  },
] as const

type SectionSlug = typeof SECTIONS[number]['slug']

// ── Helpers ──────────────────────────────────────────────────────────────────

function Code({ code, lang = 'sh', colorize = false }: { code: string; lang?: string; colorize?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="docs-code-block">
      <pre><code>
        {colorize
          ? code.split('\n').map((line, i, arr) => {
              const cls = line.includes('✖') ? 'code-flagged' : line.includes('✔') ? 'code-ok' : ''
              return (
                <span key={i} className={cls || undefined}>
                  {line}{i < arr.length - 1 ? '\n' : ''}
                </span>
              )
            })
          : code}
      </code></pre>
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

function Heading({ id, level = 2, children }: { id: string; level?: 1 | 2 | 3; children: React.ReactNode }) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  const pathname = useLocation().pathname
  return (
    <Tag id={id} className="docs-heading">
      {children}
      <a
        href={`#${id}`}
        className="docs-heading-anchor"
        aria-label="Link to section"
        onClick={e => {
          e.preventDefault()
          history.pushState(null, '', `${pathname}#${id}`)
        }}
      >
        #
      </a>
    </Tag>
  )
}

// ── Page components — one per docs section ───────────────────────────────────

function GettingStartedPage() {
  return (
    <>
      <section>
        <Heading id="introduction" level={1}>Introduction</Heading>
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
        <Heading id="installation">Installation</Heading>
        <p>No installation required — run directly with npx:</p>
        <Code code="npx remediation scan" />
        <p>Or install globally:</p>
        <Code code="npm install -g remediation" />
        <p>Or add to a project:</p>
        <Code code={`npm install --save-dev remediation\n# then add to package.json scripts:\n"lint:ds": "remediation scan"`} />
      </section>

      <section>
        <Heading id="quick-start">Quick start</Heading>
        <p>Scan the current directory:</p>
        <Code code="npx remediation scan" />
        <p>Scan a specific path:</p>
        <Code code="npx remediation scan ./src" />
        <p>Generate a config file interactively:</p>
        <Code code="npx remediation init" />
        <p>Run token-only rules:</p>
        <Code code="npx remediation tokens ./src" />
      </section>

      {/* ── Install for coding agents ───────────── */}
      <section>
        <Heading id="getting-agents">Install for coding agents</Heading>
        <p>
          Install the <code>remediation</code> skill so your AI coding agent knows how to run
          the CLI as part of its workflow: scanning for drift before it finishes a task,
          proposing a token set, and rewriting hardcoded values with the codemod — preview
          first, apply only after review.
        </p>
        <p>Install from your project root. Works across 75+ agents (Claude Code, opencode,
        Cursor, Codex, Copilot, Gemini CLI, and more):</p>
        <Code code="npx skills add arnaudmanaranche/remediation" />
        <p>The installer detects which agents you have and offers a target for each.
        Prefer to scope it to one agent?</p>
        <Code code={`# Claude Code only\nnpx skills add arnaudmanaranche/remediation -a claude-code\n\n# Project-wide instead of user-global\nnpx skills add arnaudmanaranche/remediation -g`} />
        <p>As a Claude Code plugin marketplace:</p>
        <Code code={`/plugin marketplace add arnaudmanaranche/remediation\n/plugin install remediation@remediation`} />
        <h3>What the skill teaches your agent</h3>
        <p>
          The skill encodes the safe workflow rather than a single command: read any existing{' '}
          <code>remediation.config.js</code> first, run a scan before proposing changes,
          configure human-readable token names, always dry-run the codemod before applying,
          and verify the resulting diff (token-reference swaps plus injected imports — nothing
          else). It also flags what deserves extra review, like shadow rewrites where an{' '}
          <code>rgba()</code> alpha can be lost.
        </p>
        <h3>Manual install</h3>
        <p>No installer? Copy the single skill file into your project:</p>
        <Code code={`curl -o .claude/skills/remediation/SKILL.md \\\n  https://raw.githubusercontent.com/arnaudmanaranche/remediation/main/.claude/skills/remediation/SKILL.md`} />
      </section>
    </>
  )
}

function CommandsPage() {
  return (
    <>
      <section>
        <Heading id="cmd-scan">scan</Heading>
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
        <Heading id="cmd-tokens">tokens</Heading>
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
        <Heading id="cmd-analyze">analyze</Heading>
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
        <p>
          The codemod edits your source in place — it never regenerates or reformats files.
          Whole-value literals become bare references, while compound and shorthand values
          become template literals that preserve the surrounding text:
        </p>
        <Code colorize code={`// '#1976D2'        → colors.primary\n// '8px 16px'       → \`\${spacing.sm} \${spacing.md}\`\n// '0 2px 4px #000' → \`0 2px 4px \${colors.black}\`\n// '1px solid #eee' → \`1px solid \${colors.gray200}\`\n// fontSize '14px'  → typography.sm\n// fontWeight 600   → typography.semibold`} />
        <p>
          CSS-in-JS tagged templates (<code>styled.div`...`</code>, <code>css`...`</code>) are
          rewritten in place too: matched values become <code>${'{…}'}</code> interpolations
          and existing interpolations are left untouched.
        </p>
        <p>
          Auto-generated names stay readable when two values land on the same scale name:
          the value is encoded instead of a counter (<code>spacing.md_16</code> vs{' '}
          <code>spacing.md_15</code>, <code>colors.blue_2563eb</code>). Non-colliding clusters
          keep clean scale names (<code>sm</code>, <code>md</code>, <code>blue</code>).
        </p>
        <p>
          When <code>tokensImport</code> is set in your config, the needed import is injected
          into every edited file. See{' '}
          <Link to="/docs/configuration#config-tokens-import">Token import</Link>.
        </p>
      </section>

      <section>
        <Heading id="cmd-init">init</Heading>
        <p>
          Interactive wizard that creates a <code>remediation.config.js</code> in the current
          directory. Prompts for ignore patterns, rule severity overrides, and token mappings.
        </p>
        <Code code="remediation init" />
      </section>
    </>
  )
}

function RulesPage() {
  return (
    <>
      <section>
        <Heading id="rule-colors">colors/hardcoded</Heading>
        <p>
          Detects hardcoded color values in JSX style props, CSS-in-JS tagged templates,
          CSS, and SCSS files. Catches hex (<code>#fff</code>), rgb/rgba, and hsl/hsla
          formats — including inside shorthand values like{' '}
          <code>border: '1px solid #e4e4e7'</code>.
        </p>
        <Code colorize code={`// ✖ flagged\n<div style={{ color: '#1976D2' }} />\n\n// ✔ ok\n<div style={{ color: colors.primary }} />`} />
      </section>

      <section>
        <Heading id="rule-spacing">spacing/hardcoded</Heading>
        <p>
          Detects hardcoded spacing values: <code>px</code>, <code>rem</code>, <code>em</code>,
          and unitless numbers in margin/padding/gap/width/height properties.
        </p>
        <Code colorize code={`// ✖ flagged\n<div style={{ padding: '16px' }} />\n\n// ✔ ok\n<div style={{ padding: spacing.md }} />`} />
      </section>

      <section>
        <Heading id="rule-typography">typography/hardcoded</Heading>
        <p>
          Detects hardcoded font sizes (<code>fontSize</code>) and font weights (<code>fontWeight</code>)
          in JSX and CSS/SCSS.
        </p>
        <Code colorize code={`// ✖ flagged\n<p style={{ fontSize: '14px', fontWeight: 600 }} />\n\n// ✔ ok\n<p style={{ fontSize: type.sm, fontWeight: type.semibold }} />`} />
      </section>

      <section>
        <Heading id="rule-radius">radius/hardcoded</Heading>
        <p>
          Detects hardcoded <code>borderRadius</code> values in JSX and <code>border-radius</code>{' '}
          in CSS/SCSS.
        </p>
        <Code colorize code={`// ✖ flagged\n<div style={{ borderRadius: '8px' }} />\n\n// ✔ ok\n<div style={{ borderRadius: radius.md }} />`} />
      </section>

      <section>
        <Heading id="rule-shadows">shadows/hardcoded</Heading>
        <p>
          Detects hardcoded <code>boxShadow</code> in JSX and <code>box-shadow</code>{' '}
          in CSS/SCSS.
        </p>
        <Code colorize code={`// ✖ flagged\n<div style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />\n\n// ✔ ok\n<div style={{ boxShadow: shadows.md }} />`} />
      </section>

      <section>
        <Heading id="rule-drift">drift</Heading>
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
        <Heading id="rule-bypass">token-bypass</Heading>
        <p>
          Detects places where a hardcoded value is used and a matching token already exists
          in your <code>tokens</code> config. Requires the <code>tokens</code> map to be
          configured — the rule is silent otherwise.
        </p>
        <Code lang="js" code={`// remediation.config.js\nmodule.exports = {\n  tokens: {\n    '#1976D2': 'colors.primary',\n  },\n}`} />
        <Code code={`// ✖ flagged — colors.primary exists for this value\n<div style={{ color: '#1976D2' }} />`} />
      </section>
    </>
  )
}

function ConfigurationPage() {
  return (
    <>
      <section>
        <Heading id="config-file">Config file</Heading>
        <p>
          Create <code>remediation.config.js</code> at the root of your project, or run{' '}
          <code>remediation init</code> for an interactive wizard.
        </p>
        <Code lang="js" code={`// remediation.config.js\nmodule.exports = {\n  ignore: [],\n  rules: {},\n  tokens: {},\n}`} />
      </section>

      <section>
        <Heading id="config-ignore">Ignore patterns</Heading>
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
        <Heading id="config-severity">Rule severity</Heading>
        <p>
          Each rule can be set to <code>"error"</code>, <code>"warning"</code>,{' '}
          <code>"info"</code>, or <code>"off"</code>. Rules set to <code>"error"</code> cause
          the process to exit with code <code>1</code>.
        </p>
        <Code lang="js" code={`module.exports = {\n  rules: {\n    'colors/hardcoded':     'error',\n    'spacing/hardcoded':    'error',\n    'typography/hardcoded': 'warning',\n    'drift':                'warning',\n    'token-bypass':         'off',\n  },\n}`} />
      </section>

      <section>
        <Heading id="config-tokens">Token mappings</Heading>
        <p>
          The <code>tokens</code> map powers the <code>token-bypass</code> rule. Each key is
          a raw value, each value is the token name to suggest as a replacement. Bare numeric
          or keyword font weights are accepted as keys too. The codemod reuses these mappings,
          so a mapped value is rewritten to <em>your</em> token name
          (<code>colors.primary</code>) rather than an auto-generated one.
        </p>
        <Code lang="js" code={`module.exports = {\n  tokens: {\n    '#1976D2': 'colors.primary',\n    '#D32F2F': 'colors.danger',\n    '#ffffff': 'colors.white',\n    '8px':     'spacing.sm',\n    '16px':    'spacing.md',\n    '600':     'typography.semibold',\n  },\n}`} />
      </section>

      <section>
        <Heading id="config-tokens-import">Token import</Heading>
        <p>
          Set <code>tokensImport</code> to the module your tokens live in. When present, the
          codemod injects the needed import (<code>colors</code>, <code>spacing</code>, …) into
          every file it edits, so the result compiles. When omitted, the codemod still applies
          the replacements but lists the imports you need to add by hand.
        </p>
        <Code lang="js" code={`module.exports = {\n  tokensImport: '@/design/tokens',\n  tokens: {\n    '#1976D2': 'colors.primary',\n  },\n}`} />
        <Code code={`// injected at the top of each edited file\nimport { colors, spacing } from '@/design/tokens';`} />
      </section>
    </>
  )
}

function CiCdPage() {
  return (
    <>
      <section>
        <Heading id="ci-github">GitHub Actions</Heading>
        <p>Add a step to any workflow to block merges on design system violations:</p>
        <Code lang="yaml" code={`- name: Scan design system\n  run: npx remediation scan --format json --output report.json\n\n- name: Upload report\n  uses: actions/upload-artifact@v4\n  with:\n    name: remediation-report\n    path: report.json`} />
        <p>
          With <code>error</code>-severity rules configured, the first step exits with
          code <code>1</code> and fails the workflow. The upload step runs regardless to
          preserve the report as an artifact.
        </p>
      </section>

      <section>
        <Heading id="ci-baseline">Baseline mode</Heading>
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

function PrivacyPage() {
  return (
    <>
      <section>
        <Heading id="telemetry">Telemetry</Heading>
        <p>
          <code>scan</code>, <code>tokens</code>, and <code>analyze</code> send anonymous usage
          data — command name, duration, violation counts, and CLI/Node/OS version — via
          OpenTelemetry. It never includes file paths, source code, config contents, or any
          other identifier.
        </p>
        <p>
          Disable it with a flag, an env var, or the industry-standard{' '}
          <code>DO_NOT_TRACK</code> convention:
        </p>
        <Code code={`remediation scan --no-telemetry\n\n# or\nREMEDIATION_TELEMETRY=0 remediation scan\n\n# respected automatically:\nDO_NOT_TRACK=1 remediation scan`} />
        <p>
          On first run, a one-time notice is printed to stderr and the choice is remembered in{' '}
          <code>~/.remediation/telemetry.json</code> so it isn't shown again.
        </p>
        <p>
          If you're running a fork or a private build, point telemetry at your own OTLP backend
          with the standard OpenTelemetry env vars — these always override the built-in default:
        </p>
        <Code code={`export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-collector/v1/traces"\nexport OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer%20<TOKEN>"`} />
      </section>
    </>
  )
}

const PAGE_BY_SLUG: Record<SectionSlug, ComponentType> = {
  'getting-started': GettingStartedPage,
  'commands': CommandsPage,
  'rules': RulesPage,
  'configuration': ConfigurationPage,
  'ci-cd': CiCdPage,
  'privacy': PrivacyPage,
}

// ── Component ────────────────────────────────────────────────────────────────

export function DocsPage() {
  const { section: slug } = useParams<{ section: SectionSlug }>()
  const location = useLocation()
  const [activeId, setActiveId] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollingRef = useRef(false)

  const index = SECTIONS.findIndex(s => s.slug === slug)
  const section = index === -1 ? null : SECTIONS[index]

  // New page: back to top, or land on the deep-linked heading.
  useEffect(() => {
    if (!slug) return
    const hash = location.hash.slice(1)
    scrollingRef.current = true
    setActiveId(hash)
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setTimeout(() => { scrollingRef.current = false }, 900)
      }, 80)
    } else {
      window.scrollTo(0, 0)
      scrollingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Track the heading currently in view for the right-hand "On this page".
  useEffect(() => {
    if (!slug) return
    const headings = contentRef.current?.querySelectorAll('h1[id], h2[id], h3[id]') ?? []
    const obs = new IntersectionObserver(
      entries => {
        if (scrollingRef.current) return
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    headings.forEach(h => obs.observe(h))
    return () => obs.disconnect()
  }, [slug])

  // Legacy single-page URLs (/docs, /docs#anchor) → routed equivalent.
  if (!section) {
    const id = location.hash.slice(1)
    const target =
      (slug && SECTIONS.find(s => s.slug === slug)) ??
      SECTIONS.find(s => s.items.some(item => item.id === id)) ??
      SECTIONS[0]
    return <Navigate to={`/docs/${target.slug}${location.hash}`} replace />
  }

  const Page = PAGE_BY_SLUG[section.slug]
  const prev = index > 0 ? SECTIONS[index - 1] : null
  const next = index < SECTIONS.length - 1 ? SECTIONS[index + 1] : null

  return (
    <div className="docs-layout">
      {/* Left sidebar — navigates between pages */}
      <aside className="docs-sidebar">
        <nav className="docs-nav">
          {SECTIONS.map(s => (
            <div key={s.slug} className="docs-nav-section">
              <span className="docs-nav-title">{s.title}</span>
              {s.items.map(item =>
                s.slug === slug ? (
                  // Within the current page: smooth-scroll anchors
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`docs-nav-link ${activeId === item.id ? 'docs-nav-active' : ''}`}
                    onClick={e => {
                      e.preventDefault()
                      scrollingRef.current = true
                      setActiveId(item.id)
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      history.replaceState(null, '', `/docs/${section.slug}#${item.id}`)
                      setTimeout(() => { scrollingRef.current = false }, 900)
                    }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={`/docs/${s.slug}`}
                    className="docs-nav-link"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content — just this section's page */}
      <article className="docs-content">
        <div ref={contentRef}>
          <Page />
        </div>
        <nav className="docs-pager">
          {prev ? (
            <Link to={`/docs/${prev.slug}`} className="docs-pager-link docs-pager-prev">
              <span className="docs-pager-dir">Previous</span>
              <span className="docs-pager-title">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link to={`/docs/${next.slug}`} className="docs-pager-link docs-pager-next">
              <span className="docs-pager-dir">Next</span>
              <span className="docs-pager-title">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      {/* Right TOC — the headings of this page */}
      <aside className="docs-toc">
        <span className="docs-toc-title">On this page</span>
        <div className="docs-toc-group">
          <span className="docs-toc-group-label">{section.title}</span>
          {section.items.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`docs-toc-link ${activeId === item.id ? 'docs-toc-active' : ''}`}
              onClick={e => {
                e.preventDefault()
                scrollingRef.current = true
                setActiveId(item.id)
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                history.replaceState(null, '', `/docs/${section.slug}#${item.id}`)
                setTimeout(() => { scrollingRef.current = false }, 900)
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </aside>
    </div>
  )
}
