import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import pc from 'picocolors';

interface TelemetryConfig {
  enabled: boolean;
  notifiedAt: string;
}

function configPath(): string {
  return path.join(os.homedir(), '.remediation', 'telemetry.json');
}

function readConfig(): TelemetryConfig | null {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeConfig(config: TelemetryConfig): void {
  try {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // Best-effort — a failure to persist consent must never break the CLI.
  }
}

function envDisablesTelemetry(): boolean {
  if (process.env.DO_NOT_TRACK === '1') return true;
  if (process.env.REMEDIATION_TELEMETRY === '0') return true;
  if (process.env.REMEDIATION_TELEMETRY === 'false') return true;
  return false;
}

/**
 * Opt-out telemetry: enabled by default, disabled via DO_NOT_TRACK=1,
 * REMEDIATION_TELEMETRY=0, or --no-telemetry (checked by the caller).
 * Prints a one-time disclosure notice on first run, per market convention
 * (Next.js, Nx, Angular CLI).
 */
export function isTelemetryEnabled(cliFlag: boolean | undefined): boolean {
  if (cliFlag === false) return false;
  if (envDisablesTelemetry()) return false;

  const config = readConfig();
  if (config === null) {
    notifyFirstRun();
    writeConfig({ enabled: true, notifiedAt: new Date().toISOString() });
    return true;
  }

  return config.enabled;
}

function notifyFirstRun(): void {
  console.error(
    pc.dim(
      '\nremediation collects anonymous usage data (command, duration, violation counts) ' +
        'to improve the tool. No file paths, code, or identifiers are collected.\n' +
        'Disable with --no-telemetry, REMEDIATION_TELEMETRY=0, or DO_NOT_TRACK=1.\n',
    ),
  );
}
