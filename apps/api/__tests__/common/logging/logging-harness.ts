import { Writable } from 'node:stream';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  INestApplication,
  Logger as NestLogger,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';

import { applyGlobalPipeline } from '../../../src/app/global-pipeline';
import { buildLoggerParams, type LoggerConfig } from '../../../src/common/logging/logger-options';

export type LogLine = Record<string, unknown>;

export interface CapturedStream {
  stream: Writable;
  /** Raw text written so far. */
  text: () => string;
  /** Parsed JSON lines written so far. */
  lines: () => LogLine[];
  /** Drops what was written so far (the Nest startup lines). */
  clear: () => void;
}

export function createCapturedStream(): CapturedStream {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return {
    stream,
    clear: () => {
      chunks.length = 0;
    },
    text: () => chunks.join(''),
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line) as LogLine),
  };
}

@Controller()
export class LoggingProbeController {
  private readonly logger = new NestLogger('X');

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('health/dependencies')
  dependencies(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ok')
  ok(): { success: boolean } {
    this.logger.warn('message');
    return { success: true };
  }

  @Get('missing')
  missing(): never {
    throw new NotFoundException('nothing here');
  }

  @Get('bad-request')
  badRequest(): never {
    throw new BadRequestException('nope');
  }

  @Get('boom')
  boom(): never {
    throw new Error('boom');
  }

  @Get('string-thrown')
  stringThrown(): never {
    throw 'plain string';
  }

  @Post('echo')
  echo(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return body;
  }
}

export const DEFAULT_LOGGING_CONFIG: LoggerConfig = {
  logLevel: 'info',
  nodeEnv: 'production',
  gcpProjectId: undefined,
};

/**
 * Builds an app with the real logger options writing to a captured stream and the global
 * pipeline (validation pipe plus `AllExceptionsFilter`), as `main.ts` does.
 *
 * nestjs-pino keeps one root logger per module registry (the first app's options and stream win),
 * so call this once per test file, in `beforeAll`, and use `captured.clear()` between tests.
 */
export async function createLoggingApp(
  config: Partial<LoggerConfig> = {},
): Promise<{ app: INestApplication; captured: CapturedStream }> {
  const captured = createCapturedStream();
  const moduleRef = await Test.createTestingModule({
    imports: [
      LoggerModule.forRoot(
        buildLoggerParams({ ...DEFAULT_LOGGING_CONFIG, ...config }, captured.stream),
      ),
    ],
    controllers: [LoggingProbeController],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false, bodyParser: true });
  app.useLogger(app.get(Logger));
  applyGlobalPipeline(app);
  app.setGlobalPrefix('api/v1');
  await app.init();
  captured.clear();
  return { app, captured };
}

/** Closes the app and silences the static Nest logger again so no output leaks between tests. */
export async function closeLoggingApp(app: INestApplication): Promise<void> {
  await app.close();
  NestLogger.overrideLogger(false);
}

/**
 * pino-http writes the completion line on the response `finish` event, which can fire after the
 * client already has the full response. Waits until pending socket events have run.
 */
export async function settleLogs(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 20));
}
