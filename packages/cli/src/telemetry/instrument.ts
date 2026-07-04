import { SpanStatusCode, type Span } from '@opentelemetry/api';
import * as os from 'os';
import { isTelemetryEnabled } from './consent';
import { startTelemetry, getTracer, shutdownTelemetry } from './sdk';
import { version } from '../../package.json';

/**
 * Wraps a CLI command action in an OTel span, gated by opt-out consent.
 * Never throws or delays exit on telemetry failure — the command's own
 * result/exit code always wins.
 */
export async function withTelemetry<T>(
  commandName: string,
  telemetryFlag: boolean | undefined,
  fn: (span: Span | undefined) => Promise<T>,
): Promise<T> {
  if (!isTelemetryEnabled(telemetryFlag)) {
    return fn(undefined);
  }

  startTelemetry();
  const tracer = getTracer();

  return tracer.startActiveSpan(`cli.command.${commandName}`, async (span) => {
    span.setAttributes({
      'cli.version': version,
      'node.version': process.version,
      'os.platform': os.platform(),
    });

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
      await shutdownTelemetry();
    }
  });
}
