/** Cloud Logging severity names used by the structured log entries. */
export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

const SEVERITY_BY_LEVEL: Readonly<Record<string, LogSeverity>> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

/** Maps a pino level label to a Cloud Logging severity. Unknown labels fall back to `INFO`. */
export function levelToSeverity(label: string): LogSeverity {
  return SEVERITY_BY_LEVEL[label] ?? 'INFO';
}

/** The pino `formatters.level` function: replaces the numeric `level` with a `severity` string. */
export function formatLevel(label: string): { severity: LogSeverity } {
  return { severity: levelToSeverity(label) };
}
