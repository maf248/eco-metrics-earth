import { HttpException, HttpStatus, Logger } from '@nestjs/common';

import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let loggerErrorSpy: jest.SpyInstance;

  const request = {
    url: '/api/v1/test',
    method: 'GET',
  };

  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as Parameters<AllExceptionsFilter['catch']>[1];

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response.status.mockClear();
    response.json.mockClear();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should preserve status and message for HttpException errors', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Not found',
      status: HttpStatus.NOT_FOUND,
    });
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should unwrap a single validation message from the error response object', () => {
    const exception = new HttpException(
      { statusCode: 400, message: 'fromDate must be a valid date', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'fromDate must be a valid date',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('should fall back to Unknown error when the HttpException response has no message', () => {
    const exception = new HttpException({ error: 'Bad Request' }, HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Unknown error',
      status: HttpStatus.BAD_REQUEST,
    });
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should join multiple validation messages into a single error string', () => {
    const exception = new HttpException(
      {
        statusCode: 400,
        message: ['fromDate is required', 'toDate must be after fromDate'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'fromDate is required; toDate must be after fromDate',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('should fall back to 500 for non-HttpException errors and log the stack', () => {
    const exception = new Error('Unexpected failure');

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal server error',
        path: request.url,
        method: request.method,
      }),
      exception.stack,
    );
  });

  it('should log 5xx HttpExceptions with their explicit message and stack', () => {
    const exception = new HttpException('Service unavailable', HttpStatus.SERVICE_UNAVAILABLE);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Service unavailable',
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service unavailable',
        path: request.url,
        method: request.method,
      }),
      exception.stack,
    );
  });

  it('should treat unknown non-Error values as 500 without a stack', () => {
    filter.catch('string-thrown', host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal server error',
      }),
      undefined,
    );
  });
});
