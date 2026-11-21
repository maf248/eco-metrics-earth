import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

import { ProviderDataError, ProviderError } from '../../../src/common/errors/provider-error';
import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter';
import { SentryThrottle } from '../../../src/common/sentry/sentry-throttle';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
  flush: jest.fn(),
}));

const captureException = Sentry.captureException as jest.Mock;
const flush = Sentry.flush as jest.Mock;

describe('AllExceptionsFilter Sentry capture', () => {
  let current: number;
  let filter: AllExceptionsFilter;
  let loggerErrorSpy: jest.SpyInstance;
  let calls: string[];

  const response = {
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/api/v1/test?secret=1', method: 'GET' }),
    }),
  } as unknown as Parameters<AllExceptionsFilter['catch']>[1];

  beforeEach(() => {
    current = 1_000_000;
    response.headersSent = false;
    calls = [];
    filter = new AllExceptionsFilter(new SentryThrottle(() => current));
    response.status.mockClear().mockReturnThis();
    response.json.mockReset().mockImplementation(() => {
      calls.push('json');
    });
    captureException.mockReset().mockImplementation(() => {
      calls.push('capture');
    });
    flush.mockReset().mockImplementation(async () => {
      calls.push('flush');
      return true;
    });
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should capture a plain Error once and keep the log entry and the 500 body', async () => {
    const error = new Error('Unexpected failure');

    await filter.catch(error, host);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(error);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it('should capture a 5xx HttpException', async () => {
    await filter.catch(new HttpException('Down', HttpStatus.SERVICE_UNAVAILABLE), host);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.NOT_FOUND,
    HttpStatus.TOO_MANY_REQUESTS,
  ])('should never capture a %i', async (status) => {
    await filter.catch(new HttpException('Client error', status), host);

    expect(captureException).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(status);
  });

  it('should capture a ProviderError with a fixed fingerprint and level warning', async () => {
    const error = new ProviderDataError('No World entity');

    await filter.catch(error, host);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        fingerprint: ['provider-unavailable'],
        level: 'warning',
        tags: { status: '502' },
      }),
    );
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Data provider unavailable or returned invalid data',
      status: HttpStatus.BAD_GATEWAY,
    });
  });

  it('should not attach the request URL to the event', async () => {
    await filter.catch(new ProviderError('boom'), host);

    expect(JSON.stringify(captureException.mock.calls)).not.toContain('secret=1');
  });

  it('should collapse repeated provider failures but still log and respond', async () => {
    await filter.catch(new ProviderError('first'), host);
    current += 10 * 60 * 1000;
    await filter.catch(new ProviderDataError('second'), host);

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(2);
    expect(response.json).toHaveBeenCalledTimes(2);

    current += 6 * 60 * 60 * 1000;
    await filter.catch(new ProviderError('third'), host);
    expect(captureException).toHaveBeenCalledTimes(2);
  });

  it('should suppress a duplicate unexpected error but still log and respond', async () => {
    await filter.catch(new Error('same'), host);
    await filter.catch(new Error('same'), host);
    await filter.catch(new Error('other'), host);

    expect(captureException).toHaveBeenCalledTimes(2);
    expect(loggerErrorSpy).toHaveBeenCalledTimes(3);
    expect(response.json).toHaveBeenCalledTimes(3);
  });

  it('should group non-Error throws together', async () => {
    await filter.catch('string-thrown', host);
    await filter.catch({ weird: true }, host);

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('should await flush with 2000 ms before writing the response', async () => {
    await filter.catch(new Error('flush me'), host);

    expect(flush).toHaveBeenCalledWith(2000);
    expect(calls).toEqual(['capture', 'flush', 'json']);
  });

  it('should not flush when the capture is suppressed', async () => {
    await filter.catch(new Error('same'), host);
    flush.mockClear();

    await filter.catch(new Error('same'), host);

    expect(flush).not.toHaveBeenCalled();
  });

  it('should keep the response intact when captureException throws', async () => {
    captureException.mockImplementation(() => {
      throw new Error('sentry down');
    });

    await expect(filter.catch(new Error('boom'), host)).resolves.toBeUndefined();

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it('should keep the response intact when flush rejects', async () => {
    flush.mockRejectedValue(new Error('timeout'));

    await expect(filter.catch(new ProviderError('boom'), host)).resolves.toBeUndefined();

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(response.json).toHaveBeenCalledTimes(1);
  });

  it('should skip writing the response when headers were already sent', async () => {
    response.headersSent = true;

    await expect(filter.catch(new Error('late failure'), host)).resolves.toBeUndefined();

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
});
