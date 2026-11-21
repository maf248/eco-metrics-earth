import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Params } from 'nestjs-pino';
import pino from 'pino';
import type { DestinationStream } from 'pino';
import type { Options } from 'pino-http';

import { isHealthProbe } from './health-probe';
import { REDACT_PATHS } from './redact-paths';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id';
import { formatLevel } from './severity';
import { buildTraceFields } from './trace-context';

export interface LoggerConfig {
  logLevel: string;
  nodeEnv: string;
  gcpProjectId: string | undefined;
}

/**
 * Builds the nestjs-pino options. Production and test write Cloud Logging structured JSON to
 * stdout with no transport; development swaps in `pino-pretty` (a transport cannot be combined
 * with `formatters.level`, so the severity formatter is dropped there). `destination` lets tests
 * capture the output.
 */
export function buildLoggerParams(config: LoggerConfig, destination?: DestinationStream): Params {
  const isDevelopment = config.nodeEnv === 'development';

  const options: Options = {
    level: config.logLevel,
    messageKey: 'message',
    base: null,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: [...REDACT_PATHS], censor: '[Redacted]' },
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const id = resolveRequestId(req.headers);
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    customProps: (req: IncomingMessage) => ({
      requestId: req.id,
      ...buildTraceFields(config.gcpProjectId, req.headers),
    }),
    serializers: {
      req: (req: IncomingMessage) => ({ method: req.method, url: req.url }),
      res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
    },
    // 5xx are logged once, with their stack, by AllExceptionsFilter.
    customLogLevel: (_req: IncomingMessage, res: ServerResponse) => {
      if (res.statusCode >= 500) {
        return 'silent';
      }
      return res.statusCode >= 400 ? 'warn' : 'info';
    },
    autoLogging: { ignore: (req: IncomingMessage) => isHealthProbe(req) },
    ...(isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: { singleLine: true, messageKey: 'message' },
          },
        }
      : { formatters: { level: formatLevel } }),
  };

  return { pinoHttp: destination ? [options, destination] : options };
}
