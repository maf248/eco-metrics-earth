import { ProviderDataError, ProviderError } from '../../../src/common/errors/provider-error';
import {
  OutboundHttpStatusError,
  OutboundNetworkError,
  OutboundTimeoutError,
} from '../../../src/common/http/outbound-http-errors';
import {
  OwidInvalidParameterError,
  OwidParseError,
  OwidUnsupportedChartError,
} from '../../../src/modules/providers/owid/owid-errors';

describe('provider errors', () => {
  it('should make outbound HTTP errors provider errors', () => {
    expect(new OutboundHttpStatusError('https://example.test/x', 503)).toBeInstanceOf(
      ProviderError,
    );
    expect(new OutboundTimeoutError('https://example.test/x')).toBeInstanceOf(ProviderError);
    expect(new OutboundNetworkError('https://example.test/x')).toBeInstanceOf(ProviderError);
  });

  it('should make OWID client errors provider errors', () => {
    expect(new OwidParseError('bad csv')).toBeInstanceOf(ProviderError);
    expect(new OwidInvalidParameterError('bad param')).toBeInstanceOf(ProviderError);
    expect(new OwidUnsupportedChartError('bad chart')).toBeInstanceOf(ProviderError);
  });

  it('should keep the OWID error class when adding context', () => {
    const original = new OwidParseError('bad csv');

    const contextual = original.withContext('OWID chart "x"');

    expect(contextual).toBeInstanceOf(OwidParseError);
    expect(contextual).toBeInstanceOf(ProviderError);
    expect(contextual.cause).toBe(original);
  });

  it('should preserve the message and cause of a data error', () => {
    const cause = new Error('root cause');

    const error = new ProviderDataError('World entity missing', { cause });

    expect(error).toBeInstanceOf(ProviderError);
    expect(error.name).toBe('ProviderDataError');
    expect(error.message).toBe('World entity missing');
    expect(error.cause).toBe(cause);
  });
});
