import { Test } from '@nestjs/testing';

import {
  OutboundHttpClient,
  OUTBOUND_FETCH,
  USER_AGENT,
} from '../../../src/common/http/outbound-http-client.service';
import {
  OutboundHttpStatusError,
  OutboundNetworkError,
  OutboundTimeoutError,
} from '../../../src/common/http/outbound-http-errors';
import { AppConfigService } from '../../../src/config/app-config.service';

describe('OutboundHttpClient', () => {
  const url = 'https://api.ourworldindata.org/v1/indicators/123.data.json';

  function buildAppConfig(overrides: Partial<AppConfigService> = {}): AppConfigService {
    return {
      owidHttpTimeoutMs: 10000,
      ...overrides,
    } as AppConfigService;
  }

  async function buildClient(fetchStub: jest.Mock) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: AppConfigService,
          useValue: buildAppConfig(),
        },
        {
          provide: OUTBOUND_FETCH,
          useValue: fetchStub,
        },
        OutboundHttpClient,
      ],
    }).compile();

    return moduleRef.get(OutboundHttpClient);
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('request headers', () => {
    it('should include the identifiable User-Agent on every request', async () => {
      const fetchStub = jest.fn().mockResolvedValue(new Response('ok', { status: 200 }));
      const client = await buildClient(fetchStub);

      await client.getText(url);

      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(fetchStub).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          headers: {
            'User-Agent': USER_AGENT,
          },
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  describe('timeout', () => {
    it('should throw OutboundTimeoutError carrying the URL when every attempt times out', async () => {
      const fetchStub = jest
        .fn()
        .mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
      const client = await buildClient(fetchStub);

      const promise = client.getText(url);
      const expectation = expect(promise).rejects.toBeInstanceOf(OutboundTimeoutError);
      expect(fetchStub).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(500);
      expect(fetchStub).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1000);
      expect(fetchStub).toHaveBeenCalledTimes(3);

      await expectation;
      await expect(promise).rejects.toMatchObject({ url });
    });
  });

  describe('body read', () => {
    function stalledBodyResponse(): Response {
      const body = new ReadableStream({
        start(controller) {
          controller.error(new DOMException('The operation timed out.', 'TimeoutError'));
        },
      });
      return new Response(body, { status: 200 });
    }

    it('should treat a timeout while reading the body as a retryable OutboundTimeoutError', async () => {
      const fetchStub = jest
        .fn()
        .mockResolvedValueOnce(stalledBodyResponse())
        .mockResolvedValueOnce(new Response('ok', { status: 200 }));
      const client = await buildClient(fetchStub);

      const promise = client.getText(url);
      await jest.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toBe('ok');
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('should throw OutboundTimeoutError when every body read times out', async () => {
      const fetchStub = jest.fn().mockImplementation(() => Promise.resolve(stalledBodyResponse()));
      const client = await buildClient(fetchStub);

      const promise = client.getText(url);
      const expectation = expect(promise).rejects.toBeInstanceOf(OutboundTimeoutError);
      await jest.advanceTimersByTimeAsync(500);
      await jest.advanceTimersByTimeAsync(1000);

      await expectation;
      expect(fetchStub).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry on transient HTTP status', () => {
    it('should succeed on the second attempt when the first returns 500', async () => {
      const fetchStub = jest
        .fn()
        .mockResolvedValueOnce(new Response('error', { status: 500 }))
        .mockResolvedValueOnce(new Response('ok', { status: 200 }));
      const client = await buildClient(fetchStub);

      const promise = client.getText(url);
      expect(fetchStub).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toBe('ok');
      expect(fetchStub).toHaveBeenCalledTimes(2);
    });

    it('should throw OutboundHttpStatusError immediately for 404 without retry', async () => {
      const fetchStub = jest.fn().mockResolvedValue(new Response('not found', { status: 404 }));
      const client = await buildClient(fetchStub);

      await expect(client.getText(url)).rejects.toBeInstanceOf(OutboundHttpStatusError);
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });

    it('should invoke fetch exactly 3 times when all attempts return 500', async () => {
      const fetchStub = jest.fn().mockResolvedValue(new Response('error', { status: 500 }));
      const client = await buildClient(fetchStub);

      const promise = client.getText(url);
      const expectation = expect(promise).rejects.toBeInstanceOf(OutboundHttpStatusError);
      expect(fetchStub).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(500);
      expect(fetchStub).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1000);
      expect(fetchStub).toHaveBeenCalledTimes(3);

      await expectation;
      await expect(promise).rejects.toMatchObject({ url, status: 500 });
    });

    it('should wait exactly 500 ms then 1 000 ms between attempts', async () => {
      const fetchStub = jest.fn().mockResolvedValue(new Response('error', { status: 500 }));
      const client = await buildClient(fetchStub);

      const promise = client.getText(url);
      const expectation = expect(promise).rejects.toBeInstanceOf(OutboundHttpStatusError);
      expect(fetchStub).toHaveBeenCalledTimes(1);

      // No second attempt before the first backoff.
      await jest.advanceTimersByTimeAsync(499);
      expect(fetchStub).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(fetchStub).toHaveBeenCalledTimes(2);

      // No third attempt before the second backoff.
      await jest.advanceTimersByTimeAsync(999);
      expect(fetchStub).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1);
      expect(fetchStub).toHaveBeenCalledTimes(3);

      await expectation;
    });
  });

  describe('network errors', () => {
    it('should throw OutboundNetworkError when fetch rejects', async () => {
      const networkError = new TypeError('fetch failed');
      const fetchStub = jest.fn().mockRejectedValue(networkError);
      const client = await buildClient(fetchStub);

      const promise = client.getText(url);
      const expectation = expect(promise).rejects.toBeInstanceOf(OutboundNetworkError);
      await jest.advanceTimersByTimeAsync(500);
      await jest.advanceTimersByTimeAsync(1000);

      await expectation;
      await expect(promise).rejects.toMatchObject({ url });
    });
  });

  describe('JSON parsing', () => {
    it('should return parsed JSON when the response body is valid', async () => {
      const fetchStub = jest
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ indicatorId: 123 }), { status: 200 }));
      const client = await buildClient(fetchStub);

      await expect(client.getJson(url)).resolves.toEqual({ indicatorId: 123 });
    });

    it('should throw a SyntaxError without retry when the response body is not valid JSON', async () => {
      const fetchStub = jest.fn().mockResolvedValue(new Response('not json', { status: 200 }));
      const client = await buildClient(fetchStub);

      await expect(client.getJson(url)).rejects.toBeInstanceOf(SyntaxError);
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
  });
});
