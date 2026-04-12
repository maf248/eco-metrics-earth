import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' });
  await app.listen(process.env['PORT'] ?? 3001);
}

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console -- intentional: console is the only logger available before NestJS DI is initialized
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
