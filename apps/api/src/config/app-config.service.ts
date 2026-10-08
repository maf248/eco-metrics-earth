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

  get owidGrapherBaseUrl(): string {
    return this.configService.getOrThrow<string>('OWID_GRAPHER_BASE_URL');
  }

  get owidApiBaseUrl(): string {
    return this.configService.getOrThrow<string>('OWID_API_BASE_URL');
  }

  get owidHttpTimeoutMs(): number {
    return this.configService.getOrThrow<number>('OWID_HTTP_TIMEOUT_MS');
  }

  get owidCacheTtlSeconds(): number {
    return this.configService.getOrThrow<number>('OWID_CACHE_TTL_SECONDS');
  }

  /** Number of trusted reverse-proxy hops in front of the API (Express `trust proxy`). Default: 0. */
  get trustProxyHops(): number {
    return this.configService.get<number>('TRUST_PROXY_HOPS') ?? 0;
  }

  /** Shared secret that lets trusted first-party traffic skip throttling. Undefined when unset or empty. */
  get internalApiKey(): string | undefined {
    const key = this.configService.get<string>('INTERNAL_API_KEY');
    return key ? key : undefined;
  }
}
