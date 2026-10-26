/**
 * Base class for every failure caused by an external data provider: the
 * provider was unreachable, answered with an error, or sent something
 * unusable. The global exception filter maps any `ProviderError` to
 * `502 Bad Gateway`, so a new provider only has to extend this class.
 */
export class ProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProviderError';
  }
}

/**
 * The provider answered, but the content is semantically unusable
 * (e.g. the World entity is missing, there are no rows).
 */
export class ProviderDataError extends ProviderError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProviderDataError';
  }
}
