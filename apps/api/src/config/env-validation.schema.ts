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
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('false'),
  OWID_GRAPHER_BASE_URL: owidBaseUrlValidator('https://ourworldindata.org/grapher'),
  OWID_API_BASE_URL: owidBaseUrlValidator('https://api.ourworldindata.org/v1'),
  OWID_HTTP_TIMEOUT_MS: Joi.number().integer().min(1000).max(60000).default(10000),
  OWID_CACHE_TTL_SECONDS: Joi.number().integer().min(60).max(604800).default(86400),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'TRUST_PROXY_HOPS must be a non-negative integer.',
    'number.integer': 'TRUST_PROXY_HOPS must be a non-negative integer.',
    'number.min': 'TRUST_PROXY_HOPS must be a non-negative integer.',
  }),
  INTERNAL_API_KEY: Joi.string().min(32).optional().allow('').messages({
    'string.base': 'INTERNAL_API_KEY must be a string.',
    'string.min': 'INTERNAL_API_KEY must be at least 32 characters long.',
  }),
});
