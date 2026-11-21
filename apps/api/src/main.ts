// Must stay the first import: Sentry is initialized before any framework module loads.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app/app.module';
import { applyGlobalPipeline } from './app/global-pipeline';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  // bufferLogs holds boot logs until the pino logger is installed; abortOnError: false makes a
  // module-initialization failure (invalid env var, DI error) reject so the catch below logs it.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    abortOnError: false,
  });
  app.useLogger(app.get(Logger));

  applyGlobalPipeline(app);

  app.use(helmet());
  app.setGlobalPrefix('api/v1');

  const appConfig = app.get(AppConfigService);
  // Trust exactly N proxy hops so req.ip is the real client address. Never `true`.
  app.set('trust proxy', appConfig.trustProxyHops);
  app.enableCors({ origin: appConfig.corsOrigins });

  // Swagger / OpenAPI
  if (appConfig.swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('eco-metrics earth API')
      .setDescription(
        'Environmental metrics BFF — air quality, CO₂ emissions, global temperature, and more.',
      )
      .setVersion('1.0.0')
      .addServer(`http://localhost:${appConfig.port}`, 'local')
      .addTag('Health', 'Health check endpoint')
      .addTag('Water Footprint', 'Product water footprint data')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'eco-metrics earth — API Docs',
    });
  }

  // Handle SIGTERM/SIGINT: drain in-flight requests, run lifecycle hooks, then exit.
  app.enableShutdownHooks();

  await app.listen(appConfig.port);
}

bootstrap().catch((err: unknown) => {
  // No DI logger exists before NestFactory.create resolves: write one Cloud Logging JSON line.
  const message = err instanceof Error && err.stack ? err.stack : String(err);
  process.stderr.write(`${JSON.stringify({ severity: 'ERROR', message })}\n`);
  process.exit(1);
});
