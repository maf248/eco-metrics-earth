/**
 * @jest-environment node
 */

import http, { createServer, type Server } from 'node:http';

import { waitForUrl } from '../../e2e/readiness';

function httpFetch(url: string): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      resolve({ status: response.statusCode ?? 0 });
    });
    request.on('error', (error) => {
      reject(error);
    });
  });
}

describe('waitForUrl', () => {
  it('should resolve when the URL returns 200 immediately', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ status: 200 });

    await waitForUrl('http://localhost:3001/health', {
      fetchImpl,
      timeoutMs: 500,
      intervalMs: 10,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/health');
  });

  it('should resolve after retrying through connection failures', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValue({ status: 200 });

    await waitForUrl('http://localhost:3001/health', {
      fetchImpl,
      timeoutMs: 500,
      intervalMs: 10,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('should keep polling on non-200 statuses', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValue({ status: 200 });

    await waitForUrl('http://localhost:3001/health', {
      fetchImpl,
      timeoutMs: 500,
      intervalMs: 10,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('should reject with a clear message on timeout', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      waitForUrl('http://localhost:3001/health', {
        fetchImpl,
        timeoutMs: 50,
        intervalMs: 10,
      }),
    ).rejects.toThrow('Timed out waiting for http://localhost:3001/health after 50ms');
  });

  describe('real socket', () => {
    let server: Server;
    let port: number;

    beforeAll((done) => {
      server = createServer((_req, res) => {
        res.writeHead(200);
        res.end('ok');
      });
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address !== null && typeof address === 'object') {
          port = address.port;
        }
        done();
      });
    });

    afterAll((done) => {
      server.close(done);
    });

    it('should resolve against a real ephemeral HTTP server', async () => {
      await waitForUrl(`http://127.0.0.1:${port}/`, {
        fetchImpl: httpFetch,
        timeoutMs: 500,
        intervalMs: 10,
      });
    });

    it('should resolve using the global fetch implementation', async () => {
      await waitForUrl(`http://127.0.0.1:${port}/`, {
        timeoutMs: 500,
        intervalMs: 10,
      });
    });
  });
});
