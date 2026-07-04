/**
 * Default OTLP export target baked into the published `remediation` package,
 * so telemetry works out of the box without any config from the end user.
 *
 * FORKS: don't edit these values to point at your own backend — set
 * OTEL_EXPORTER_OTLP_ENDPOINT (or REMEDIATION_OTEL_ENDPOINT) and
 * OTEL_EXPORTER_OTLP_HEADERS instead. Env vars always win over these
 * defaults (see sdk.ts) — no code change or rebuild required.
 *
 * MAINTAINER: DEFAULT_OTLP_TOKEN must be an Axiom API token scoped
 * ingest-only to DEFAULT_OTLP_DATASET, with a rate limit configured on the
 * Axiom side. It ships publicly in the npm tarball and git history — same
 * threat model as a Sentry DSN or a PostHog public key. Never use a
 * broader-scoped or unrated-limited token here.
 */
export const DEFAULT_OTLP_ENDPOINT = 'https://api.axiom.co/v1/traces';
export const DEFAULT_OTLP_DATASET = '<DATASET>';
export const DEFAULT_OTLP_TOKEN = '<TOKEN>';
