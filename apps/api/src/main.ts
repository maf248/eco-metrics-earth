import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(helmet());
  app.setGlobalPrefix('api/v1');

  const appConfig = app.get(AppConfigService);
  app.enableCors({ origin: appConfig.corsOrigin });

  // Swagger / OpenAPI
  if (appConfig.swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('eco-metrics earth API')
      .setDescription(
        'Environmental metrics BFF — air quality, CO₂ emissions, global temperature, and more.',
      )
      .setVersion('1.0.0')
      .addServer(`http://localhost:${appConfig.port}`, 'local')
      .addServer('https://eco-metrics-earth-api.railway.app', 'production (Railway)')
      .addTag('Health', 'Health check endpoint')
      .addTag('Demo', 'Demo validation endpoints (mock)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'eco-metrics earth — API Docs',
    });
  }

  await app.listen(appConfig.port);
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console -- intentional: console is the only logger available before NestJS DI is initialized
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
