import { ProviderError } from '../../../common/errors/provider-error';

type OwidClientErrorConstructor = new (
  message: string,
  options?: { cause?: unknown },
) => OwidClientError;

export class OwidClientError extends ProviderError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OwidClientError';
  }

  /**
   * Returns an error of the same class whose message is prefixed with the
   * resource that failed (e.g. a chart slug), keeping this error as the cause.
   */
  withContext(context: string): OwidClientError {
    const ErrorClass = this.constructor as OwidClientErrorConstructor;
    return new ErrorClass(`${context}: ${this.message}`, { cause: this });
  }
}

export class OwidInvalidParameterError extends OwidClientError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OwidInvalidParameterError';
  }
}

export class OwidParseError extends OwidClientError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OwidParseError';
  }
}

export class OwidUnsupportedChartError extends OwidClientError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OwidUnsupportedChartError';
  }
}
