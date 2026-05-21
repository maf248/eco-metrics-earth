import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
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

  app.use(helmet());
  app.setGlobalPrefix('api/v1');

  const appConfig = app.get(AppConfigService);
  app.enableCors({ origin: appConfig.corsOrigin });

  await app.listen(appConfig.port);
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console -- intentional: console is the only logger available before NestJS DI is initialized
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
