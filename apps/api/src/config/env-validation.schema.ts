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
});
