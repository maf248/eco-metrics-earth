export interface WaitForUrlOptions {
  fetchImpl?: FetchLike;
  timeoutMs: number;
  intervalMs: number;
}

export type FetchLike = (url: string) => Promise<{
  status: number;
}>;

export async function waitForUrl(url: string, options: WaitForUrlOptions): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = async (): Promise<void> => {
      try {
        const response = await fetchImpl(url);
        if (response.status === 200) {
          resolve();
          return;
        }
      } catch {
        // Connection refused or other network error — keep polling.
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= options.timeoutMs) {
        reject(new Error(`Timed out waiting for ${url} after ${options.timeoutMs}ms`));
        return;
      }

      setTimeout(attempt, options.intervalMs);
    };

    void attempt();
  });
}
