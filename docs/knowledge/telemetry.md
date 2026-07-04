# Telemetry

`packages/cli/src/telemetry/` instruments `scan`, `tokens`, and `analyze` with
OpenTelemetry traces. `init` is not instrumented — it's a local interactive
scaffolding command with nothing worth measuring.

## What's collected

One span per command invocation (`cli.command.<name>`), attributes only —
never file paths, source code, cluster values, or config contents:

- `cli.version`, `node.version`, `os.platform`
- `scan`/`tokens`: `scan.files_count`, `scan.violations_total`, `scan.violations_errors`
- `analyze`: `analyze.design_values_count`, `analyze.proposals_count`, `analyze.codemod`

## Consent (opt-out)

`consent.ts` implements opt-out telemetry per market convention (Next.js, Nx,
Angular CLI):

- Enabled by default; disabled via `--no-telemetry`, `REMEDIATION_TELEMETRY=0`,
  or `DO_NOT_TRACK=1`.
- First run prints a one-time disclosure to stderr and persists the choice to
  `~/.remediation/telemetry.json` so it isn't repeated.
- Consent persistence is best-effort — a filesystem failure never breaks the CLI.

## Export

`sdk.ts` lazily starts a `NodeSDK` with an OTLP HTTP trace exporter.

**Default backend**: the published package ships pointed at Axiom by default
(`defaults.ts`), so telemetry works out of the box with zero config from end
users — no env vars to set, no first-run friction beyond the opt-out notice.
The embedded `DEFAULT_OTLP_TOKEN` is an Axiom API token scoped ingest-only to
`DEFAULT_OTLP_DATASET`, rate-limited on the Axiom side. It is expected to be
publicly readable in the npm tarball and git history — same threat model as a
Sentry DSN or a PostHog public key. **Never replace it with a broader-scoped
or unrated token.** If the maintainer hasn't filled in real values yet
(placeholders still say `<TOKEN>`/`<DATASET>`), the default header is skipped
and nothing is exported.

**Overriding for forks / private deployments**: set standard env vars —
`OTEL_EXPORTER_OTLP_ENDPOINT` (or `REMEDIATION_OTEL_ENDPOINT`) for the URL,
and `OTEL_EXPORTER_OTLP_HEADERS` for auth. These always win over the baked-in
default — **do not edit `defaults.ts`** to point at a different backend, since
that file's values are meant to be the maintainer's own Axiom project. Example
pointing at a self-hosted OTel Collector instead:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://collector.internal:4318/v1/traces"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer%20<TOKEN>"
```

Note the token must be URL-encoded (`%20` for the space after `Bearer`) when
passed via `OTEL_EXPORTER_OTLP_HEADERS`.

`sdk.ts#otlpHeaders` deliberately returns `undefined` (rather than the
default headers) whenever `OTEL_EXPORTER_OTLP_HEADERS`/
`OTEL_EXPORTER_OTLP_TRACES_HEADERS` is set — `OTLPTraceExporter` merges
explicitly-passed headers *over* its own env-based fallback, so passing our
default headers unconditionally would silently override a fork's env config.

`instrument.ts#withTelemetry` wraps each command action: starts the span,
records exceptions, and flushes/shuts down the SDK in a `finally` block with a
2s timeout before returning — telemetry never delays or fails the command
itself.

## Adding a new instrumented command

Wrap the action body in `withTelemetry(name, command.parent?.opts().telemetry, async (span) => { ... })`
and set command-specific attributes via `span?.setAttributes(...)`. The
`--no-telemetry` flag lives on the root `program` in
`packages/cli/src/commands/run.ts`, so subcommand actions read it via
`command.parent.opts()`.
