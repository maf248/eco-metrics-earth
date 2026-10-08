import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import { waitForUrl } from './readiness.ts';
import { E2E_INTERNAL_API_KEY, E2E_TRUST_PROXY_HOPS } from './utils/api-env.ts';

const API_HEALTH_URL = 'http://localhost:3001/api/v1/health';
const WEB_URL = 'http://localhost:3000';
const API_COMMAND = 'npx';
const API_ARGS = ['nx', 'serve', 'api'];
const WEB_COMMAND = 'npx';
const WEB_ARGS = ['nx', 'dev', 'web'];
const API_READINESS_TIMEOUT_MS = 120_000;
const PRE_CHECK_TIMEOUT_MS = 1_000;
const PRE_CHECK_INTERVAL_MS = 200;
const CLEANUP_GRACE_PERIOD_MS = 3_000;

interface ProcessInfo {
  pid: number;
  ppid: number;
}

function log(message: string): void {
  process.stdout.write(`[run-dev-servers] ${message}\n`);
}

function logError(message: string): void {
  process.stderr.write(`[run-dev-servers] ${message}\n`);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readChildrenFromProc(pid: number): number[] {
  const childrenPath = `/proc/${pid}/task/${pid}/children`;
  if (!existsSync(childrenPath)) {
    return [];
  }

  try {
    const content = readFileSync(childrenPath, 'utf8').trim();
    if (content === '') {
      return [];
    }
    return content
      .split(/\s+/)
      .map((token) => Number.parseInt(token, 10))
      .filter((candidate) => Number.isFinite(candidate) && candidate > 0);
  } catch {
    return [];
  }
}

function parsePsOutput(output: string): ProcessInfo[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [pidToken, ppidToken] = line.split(/\s+/);
      return {
        pid: Number.parseInt(pidToken ?? '0', 10),
        ppid: Number.parseInt(ppidToken ?? '0', 10),
      };
    })
    .filter(
      (info) =>
        Number.isFinite(info.pid) && info.pid > 0 && Number.isFinite(info.ppid) && info.ppid > 0,
    );
}

function collectDescendantsViaProc(rootPid: number): number[] | undefined {
  const firstChildren = readChildrenFromProc(rootPid);
  if (firstChildren.length === 0) {
    return undefined;
  }

  const result = new Set<number>();
  const queue = [rootPid, ...firstChildren];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || result.has(current)) {
      continue;
    }
    result.add(current);

    const children = readChildrenFromProc(current);
    for (const child of children) {
      if (!result.has(child)) {
        queue.push(child);
      }
    }
  }

  return Array.from(result);
}

function collectDescendantsViaPs(rootPid: number): number[] {
  try {
    const output = execSync('ps -eo pid=,ppid=', { encoding: 'utf8' });
    const processes = parsePsOutput(output);
    const result = new Set<number>();
    const queue = [rootPid];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || result.has(current)) {
        continue;
      }
      result.add(current);

      const children = processes.filter((info) => info.ppid === current);
      for (const child of children) {
        if (!result.has(child.pid)) {
          queue.push(child.pid);
        }
      }
    }

    return Array.from(result);
  } catch {
    return [rootPid];
  }
}

function collectDescendants(rootPid: number): number[] {
  return collectDescendantsViaProc(rootPid) ?? collectDescendantsViaPs(rootPid);
}

function sendSignal(pids: number[], signal: NodeJS.Signals): void {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code !== 'ESRCH') {
        logError(`failed to send ${signal} to ${pid}: ${typedError.message}`);
      }
    }
  }
}

async function killProcessTree(rootPid: number): Promise<void> {
  const descendants = collectDescendants(rootPid);
  log(`terminating process tree rooted at ${rootPid} (${descendants.length} pids)`);
  sendSignal(descendants, 'SIGTERM');

  await delay(CLEANUP_GRACE_PERIOD_MS);

  const survivors = descendants.filter(isAlive);
  if (survivors.length > 0) {
    log(`killing ${survivors.length} survivors after grace period`);
    sendSignal(survivors, 'SIGKILL');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ServerManager {
  private spawnedChildren: ChildProcess[] = [];
  private isShuttingDown = false;

  get children(): ChildProcess[] {
    return this.spawnedChildren;
  }

  get shuttingDown(): boolean {
    return this.isShuttingDown;
  }

  register(child: ChildProcess): void {
    this.spawnedChildren.push(child);
  }

  async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    const pids = this.spawnedChildren
      .map((child) => child.pid)
      .filter((pid): pid is number => pid !== undefined);

    for (const pid of pids) {
      await killProcessTree(pid);
    }
  }
}

async function isApiHealthy(): Promise<boolean> {
  try {
    await waitForUrl(API_HEALTH_URL, {
      timeoutMs: PRE_CHECK_TIMEOUT_MS,
      intervalMs: PRE_CHECK_INTERVAL_MS,
    });
    return true;
  } catch {
    return false;
  }
}

// Child output is piped and forwarded to the wrapper's stdio only while the
// wrapper is running. During teardown the killed dev servers (nx/next) print
// "did not complete" / non-zero-exit reports that would otherwise be relayed
// by Playwright as [WebServer] noise after the suite has already passed. The
// data listeners stay attached during shutdown so the pipes keep draining.
function forwardStream(
  stream: Readable | null,
  write: (chunk: string) => void,
  isGated: () => boolean,
): void {
  if (stream === null) {
    return;
  }
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    if (!isGated()) {
      write(chunk);
    }
  });
}

function spawnServer(
  command: string,
  args: string[],
  manager: ServerManager,
  env: Record<string, string>,
): ChildProcess {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Intentionally not detached: children share the wrapper's process group
    // so Playwright's group-level signals reach them as a secondary net.
  });
  forwardStream(
    child.stdout,
    (chunk) => process.stdout.write(chunk),
    () => manager.shuttingDown,
  );
  forwardStream(
    child.stderr,
    (chunk) => process.stderr.write(chunk),
    () => manager.shuttingDown,
  );
  return child;
}

async function waitForChildOrAdopt(
  child: ChildProcess,
  url: string,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const cleanup = (): void => {
      resolved = true;
      child.removeAllListeners();
    };

    child.on('error', (error: Error) => {
      if (resolved) {
        return;
      }
      cleanup();
      reject(error);
    });

    child.on('exit', async (code: number | null) => {
      if (resolved) {
        return;
      }

      // The child exited before readiness. Re-check the URL once in case
      // another process took over the port during startup.
      try {
        await waitForUrl(url, {
          timeoutMs: PRE_CHECK_TIMEOUT_MS,
          intervalMs: PRE_CHECK_INTERVAL_MS,
        });
        cleanup();
        resolve();
      } catch {
        cleanup();
        reject(
          new Error(
            `Server process exited${code !== null ? ` with code ${code}` : ''} before ${url} became ready`,
          ),
        );
      }
    });

    waitForUrl(url, { timeoutMs, intervalMs: 500 })
      .then(() => {
        if (resolved) {
          return;
        }
        cleanup();
        resolve();
      })
      .catch((error: Error) => {
        if (resolved) {
          return;
        }
        cleanup();
        reject(error);
      });
  });
}

async function startApi(manager: ServerManager): Promise<void> {
  if (await isApiHealthy()) {
    log('api already running — adopting');
    return;
  }

  log('starting api server...');
  const api = spawnServer(API_COMMAND, API_ARGS, manager, {
    TRUST_PROXY_HOPS: E2E_TRUST_PROXY_HOPS,
    INTERNAL_API_KEY: E2E_INTERNAL_API_KEY,
  });
  manager.register(api);

  try {
    await waitForChildOrAdopt(api, API_HEALTH_URL, API_READINESS_TIMEOUT_MS);
    log('api server ready');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`api server failed to become ready: ${message}`);
    await manager.cleanup();
    process.exit(1);
  }
}

function clearNextFetchCache(): void {
  // The Next.js dev server persists fetch() results across restarts in
  // .next/{dev,cache}/fetch-cache. Stale cache can make E2E see an older
  // dataset than the API currently serves, so clear it before each run.
  const caches = [
    join(process.cwd(), 'apps/web/.next/cache/fetch-cache'),
    join(process.cwd(), 'apps/web/.next/dev/cache/fetch-cache'),
  ];
  for (const cachePath of caches) {
    if (existsSync(cachePath)) {
      try {
        rmSync(cachePath, { recursive: true, force: true });
        log(`cleared stale fetch cache: ${cachePath}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError(`failed to clear fetch cache ${cachePath}: ${message}`);
      }
    }
  }
}

async function startWeb(manager: ServerManager): Promise<void> {
  clearNextFetchCache();
  log('starting web server...');
  const web = spawnServer(WEB_COMMAND, WEB_ARGS, manager, {
    INTERNAL_API_KEY: E2E_INTERNAL_API_KEY,
  });
  manager.register(web);

  try {
    await waitForChildOrAdopt(web, WEB_URL, API_READINESS_TIMEOUT_MS);
    log('web server ready (api was ready first)');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`web server failed to become ready: ${message}`);
    await manager.cleanup();
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const manager = new ServerManager();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    log(`received ${signal}, shutting down`);
    await manager.cleanup();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGHUP', () => void shutdown('SIGHUP'));
  process.on('exit', () => {
    // Best-effort synchronous cleanup for the wrapper's direct children.
    for (const child of manager.children) {
      const pid = child.pid;
      if (pid !== undefined) {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          // Ignore errors during synchronous exit cleanup.
        }
      }
    }
  });

  await startApi(manager);
  await startWeb(manager);

  log('both servers are up; keeping wrapper alive until Playwright signals shutdown');

  // Keep the process alive until a signal arrives. Do not unref the interval
  // because Playwright expects the wrapper to keep running.
  setInterval(() => {}, 60_000);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
