import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, type Tracer } from '@opentelemetry/api';
import { version } from '../../package.json';
import { DEFAULT_OTLP_ENDPOINT, DEFAULT_OTLP_DATASET, DEFAULT_OTLP_TOKEN } from './defaults';

let sdk: NodeSDK | null = null;

function envHeadersConfigured(): boolean {
  return Boolean(process.env.OTEL_EXPORTER_OTLP_HEADERS || process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS);
}

function envEndpointConfigured(): boolean {
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.REMEDIATION_OTEL_ENDPOINT);
}

function otlpEndpoint(): string {
  return process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.REMEDIATION_OTEL_ENDPOINT || DEFAULT_OTLP_ENDPOINT;
}

function defaultCredentialsConfigured(): boolean {
  return !DEFAULT_OTLP_TOKEN.startsWith('<') && !DEFAULT_OTLP_DATASET.startsWith('<');
}

/**
 * Skip starting the SDK entirely (no network calls at all) unless there's
 * somewhere real to send to: an explicit env override, or the maintainer's
 * default Axiom credentials have actually been filled in. Prevents every
 * local/dev run from firing unauthenticated requests at the placeholder
 * Axiom endpoint before the package is published with real values.
 */
function hasExportTarget(): boolean {
  return envEndpointConfigured() || envHeadersConfigured() || defaultCredentialsConfigured();
}

/**
 * Explicit headers passed to the exporter constructor take priority over
 * OTLPTraceExporter's own env-var fallback — so returning our baked-in
 * default here would silently override a fork's OTEL_EXPORTER_OTLP_HEADERS.
 * Returning undefined when the env var is set lets the exporter's own
 * env-based header resolution take over instead.
 */
function otlpHeaders(): Record<string, string> | undefined {
  if (envHeadersConfigured()) return undefined;
  if (DEFAULT_OTLP_TOKEN.startsWith('<') || DEFAULT_OTLP_DATASET.startsWith('<')) return undefined;

  return {
    Authorization: `Bearer ${DEFAULT_OTLP_TOKEN}`,
    'X-Axiom-Dataset': DEFAULT_OTLP_DATASET,
  };
}

export function startTelemetry(): void {
  if (sdk !== null) return;
  if (!hasExportTarget()) return;

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'remediation-cli',
      [ATTR_SERVICE_VERSION]: version,
    }),
    traceExporter: new OTLPTraceExporter({ url: otlpEndpoint(), headers: otlpHeaders() }),
  });

  sdk.start();
}

export function getTracer(): Tracer {
  return trace.getTracer('remediation-cli', version);
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk === null) return;
  const current = sdk;
  sdk = null;
  await Promise.race([
    current.shutdown(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]).catch(() => undefined);
}
