import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.getOrThrow<number>('PORT');
  }

  get nodeEnv(): string {
    return this.configService.getOrThrow<string>('NODE_ENV');
  }

  get corsOrigins(): (string | RegExp)[] {
    const rawOrigin = this.configService.getOrThrow<string>('CORS_ORIGIN');
    const origins: (string | RegExp)[] = rawOrigin.split(',').map((entry) => entry.trim());

    const pattern = this.configService.get<string>('CORS_ORIGIN_PATTERN');
    if (pattern) {
      origins.push(new RegExp(pattern));
    }

    return origins;
  }

  /** Whether Swagger/OpenAPI UI is enabled (default: false). Set SWAGGER_ENABLED=true in .env for local dev. */
  get swaggerEnabled(): boolean {
    return this.configService.get<string>('SWAGGER_ENABLED') === 'true';
  }
}
