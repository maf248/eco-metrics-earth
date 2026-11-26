import * as Joi from 'joi';

const corsOriginErrorCodes = {
  emptyEntry: 'corsOrigin.emptyEntry',
  wildcard: 'corsOrigin.wildcard',
  invalidUri: 'corsOrigin.invalidUri',
} as const;

const corsOriginPatternErrorCodes = {
  unanchoredStart: 'corsOriginPattern.unanchoredStart',
  unanchoredEnd: 'corsOriginPattern.unanchoredEnd',
  invalidRegex: 'corsOriginPattern.invalidRegex',
} as const;

const owidBaseUrlErrorCodes = {
  trailingSlash: 'owidBaseUrl.trailingSlash',
} as const;

function owidBaseUrlValidator(defaultValue: string) {
  return Joi.string()
    .uri()
    .default(defaultValue)
    .custom((value: string, helpers) => {
      if (value.endsWith('/')) {
        return helpers.error(owidBaseUrlErrorCodes.trailingSlash, { value });
      }

      return value;
    })
    .messages({
      [owidBaseUrlErrorCodes.trailingSlash]:
        '{{#label}} "{{#value}}" must not end with a trailing slash; it would produce broken request URLs like "{{#value}}//path".',
    });
}

// GCS bucket naming rules: 3-63 characters of lowercase letters, digits, dashes, underscores and
// dots, starting and ending with a letter or digit.
const SNAPSHOT_BUCKET_PATTERN = /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// GCP project ids: 6-30 characters, lowercase letters, digits and hyphens, starting with a letter
// and not ending with a hyphen.
const GCP_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const SENTRY_RELEASE_PATTERN = /^\S{1,200}$/;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export const envValidationSchema = Joi.object({
  PORT: Joi.number().port().default(3001),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:3000')
    .custom((value: string, helpers) => {
      const entries = value.split(',').map((entry) => entry.trim());

      for (const entry of entries) {
        if (entry === '') {
          return helpers.error(corsOriginErrorCodes.emptyEntry, { entry });
        }

        if (entry.includes('*')) {
          return helpers.error(corsOriginErrorCodes.wildcard, { entry });
        }

        const { error } = Joi.string().uri().validate(entry);
        if (error) {
          return helpers.error(corsOriginErrorCodes.invalidUri, { entry });
        }
      }

      return value;
    })
    .messages({
      [corsOriginErrorCodes.emptyEntry]:
        'CORS_ORIGIN contains an empty entry. Remove trailing, leading, or doubled commas.',
      [corsOriginErrorCodes.wildcard]:
        'CORS_ORIGIN entry "{{#entry}}" contains a wildcard. Use CORS_ORIGIN_PATTERN for pattern-based origins.',
      [corsOriginErrorCodes.invalidUri]: 'CORS_ORIGIN entry "{{#entry}}" is not a valid URI.',
    }),
  CORS_ORIGIN_PATTERN: Joi.string()
    .optional()
    .allow('')
    .custom((value: string, helpers) => {
      if (!value) {
        return value;
      }

      if (!value.startsWith('^')) {
        return helpers.error(corsOriginPatternErrorCodes.unanchoredStart, { value });
      }

      if (!value.endsWith('$')) {
        return helpers.error(corsOriginPatternErrorCodes.unanchoredEnd, { value });
      }

      try {
        new RegExp(value);
      } catch {
        return helpers.error(corsOriginPatternErrorCodes.invalidRegex, { value });
      }

      return value;
    })
    .messages({
      [corsOriginPatternErrorCodes.unanchoredStart]:
        'CORS_ORIGIN_PATTERN must start with "^" (anchored regex).',
      [corsOriginPatternErrorCodes.unanchoredEnd]:
        'CORS_ORIGIN_PATTERN must end with "$" (anchored regex).',
      [corsOriginPatternErrorCodes.invalidRegex]:
        'CORS_ORIGIN_PATTERN is not a valid regular expression.',
    }),
  // Swagger's Express routes bypass the global guards, so production must keep it off.
  SWAGGER_ENABLED: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('false').default('false'),
    otherwise: Joi.string().valid('true', 'false').default('false'),
  }).messages({
    'any.only':
      'SWAGGER_ENABLED must be "false" when NODE_ENV=production (and "true" or "false" otherwise).',
  }),
  OWID_GRAPHER_BASE_URL: owidBaseUrlValidator('https://ourworldindata.org/grapher'),
  OWID_API_BASE_URL: owidBaseUrlValidator('https://api.ourworldindata.org/v1'),
  OWID_HTTP_TIMEOUT_MS: Joi.number().integer().min(1000).max(60000).default(10000),
  OWID_CACHE_TTL_SECONDS: Joi.number().integer().min(60).max(604800).default(86400),
  COPERNICUS_CLIMATE_PULSE_BASE_URL: owidBaseUrlValidator(
    'https://sites.ecmwf.int/data/climatepulse/data/series',
  ),
  COPERNICUS_CLIMATE_PULSE_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(86400)
    .default(21600),
  NOAA_LSA_BASE_URL: owidBaseUrlValidator(
    'https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr',
  ),
  NOAA_LSA_CACHE_TTL_SECONDS: Joi.number().integer().min(3600).max(2592000).default(604800),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'TRUST_PROXY_HOPS must be a non-negative integer.',
    'number.integer': 'TRUST_PROXY_HOPS must be a non-negative integer.',
    'number.min': 'TRUST_PROXY_HOPS must be a non-negative integer.',
  }),
  SNAPSHOT_BUCKET: Joi.string().pattern(SNAPSHOT_BUCKET_PATTERN).optional().allow('').messages({
    'string.pattern.base':
      'SNAPSHOT_BUCKET must be a valid GCS bucket name (3-63 lowercase letters, digits, dashes, underscores or dots).',
  }),
  SNAPSHOT_PREFIX: Joi.when('SNAPSHOT_BUCKET', {
    is: Joi.string().min(1).required(),
    then: Joi.string().pattern(KEBAB_CASE_PATTERN).required(),
    otherwise: Joi.string().pattern(KEBAB_CASE_PATTERN).optional().allow(''),
  }).messages({
    'string.pattern.base': 'SNAPSHOT_PREFIX must be kebab-case (for example "production").',
    'string.empty': 'SNAPSHOT_PREFIX is required when SNAPSHOT_BUCKET is set.',
    'any.required': 'SNAPSHOT_PREFIX is required when SNAPSHOT_BUCKET is set.',
  }),
  // No schema default: AppConfigService applies the default by NODE_ENV.
  LOG_LEVEL: Joi.string()
    .valid(...LOG_LEVELS)
    .optional()
    .messages({
      'any.only': `LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}.`,
      'string.base': 'LOG_LEVEL must be a string.',
    }),
  GCP_PROJECT_ID: Joi.string().pattern(GCP_PROJECT_ID_PATTERN).optional().allow('').messages({
    'string.pattern.base':
      'GCP_PROJECT_ID must be a valid GCP project id (6-30 lowercase letters, digits or hyphens, starting with a letter).',
  }),
  // Sentry settings are optional; unset or empty keeps the SDK disabled (see `src/instrument.ts`).
  SENTRY_DSN: Joi.string().uri({ scheme: 'https' }).optional().allow('').messages({
    'string.uri': 'SENTRY_DSN must be an https URI (or empty to disable Sentry).',
    'string.uriCustomScheme': 'SENTRY_DSN must be an https URI (or empty to disable Sentry).',
    'string.base': 'SENTRY_DSN must be a string.',
  }),
  SENTRY_ENVIRONMENT: Joi.string().pattern(KEBAB_CASE_PATTERN).optional().allow('').messages({
    'string.pattern.base': 'SENTRY_ENVIRONMENT must be kebab-case (for example "production").',
    'string.base': 'SENTRY_ENVIRONMENT must be a string.',
  }),
  SENTRY_RELEASE: Joi.string().pattern(SENTRY_RELEASE_PATTERN).optional().allow('').messages({
    'string.pattern.base':
      'SENTRY_RELEASE must be 1 to 200 characters without whitespace (for example a commit SHA).',
    'string.base': 'SENTRY_RELEASE must be a string.',
  }),
  INTERNAL_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().min(32).required(),
    otherwise: Joi.string().trim().min(32).optional().allow(''),
  }).messages({
    'string.base': 'INTERNAL_API_KEY must be a string.',
    'string.min': 'INTERNAL_API_KEY must be at least 32 characters long.',
    'string.empty': 'INTERNAL_API_KEY is required when NODE_ENV=production.',
    'any.required': 'INTERNAL_API_KEY is required when NODE_ENV=production.',
  }),
});
