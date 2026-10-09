/**
 * @jest-environment node
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT_PATH = path.resolve(__dirname, '../../../../scripts/vercel-ignore.sh');

const BUILD = 1;
const SKIP = 0;

interface Repo {
  dir: string;
  previousSha: string;
  commitSha: string;
}

function git(cwd: string, args: string[]): string {
  const result = spawnSync(
    'git',
    ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args],
    { cwd, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function writeFiles(dir: string, files: string[], content: string): void {
  for (const file of files) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

/** Creates a repo with a base commit and a second commit touching `changedFiles`. */
function createRepo(changedFiles: string[]): Repo {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-ignore-'));
  git(dir, ['init', '--quiet']);
  writeFiles(dir, ['README.txt'], 'base');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', 'base']);
  const previousSha = git(dir, ['rev-parse', 'HEAD']);

  writeFiles(dir, changedFiles, 'changed');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', 'change']);
  const commitSha = git(dir, ['rev-parse', 'HEAD']);

  return { dir, previousSha, commitSha };
}

function runScript(repo: Repo, env: { message: string; previousSha?: string }): number | null {
  // Minimal environment so the host's VERCEL_* variables never leak into the script.
  const scriptEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    PATH: process.env.PATH ?? '',
    VERCEL_GIT_COMMIT_SHA: repo.commitSha,
    VERCEL_GIT_COMMIT_MESSAGE: env.message,
  };
  if (env.previousSha !== undefined) {
    scriptEnv.VERCEL_GIT_PREVIOUS_SHA = env.previousSha;
  }
  return spawnSync('bash', [SCRIPT_PATH], { cwd: repo.dir, env: scriptEnv }).status;
}

describe('scripts/vercel-ignore.sh', () => {
  let repo: Repo | undefined;

  afterEach(() => {
    if (repo) {
      fs.rmSync(repo.dir, { recursive: true, force: true });
      repo = undefined;
    }
  });

  describe('release commits', () => {
    it('should skip the build for a release commit that changes web files', () => {
      repo = createRepo(['apps/web/package.json', 'apps/web/CHANGELOG.md']);

      const status = runScript(repo, {
        message: 'chore(release): web-v2.5.3 [skip ci]',
        previousSha: repo.previousSha,
      });

      expect(status).toBe(SKIP);
    });

    it('should skip the build for a lockfile sync release commit', () => {
      repo = createRepo(['package-lock.json', 'apps/web/package.json']);

      const status = runScript(repo, {
        message: 'chore(release): sync lockfile versions [skip ci]',
        previousSha: repo.previousSha,
      });

      expect(status).toBe(SKIP);
    });

    it('should skip a release commit even when the previous SHA is missing', () => {
      repo = createRepo(['apps/web/package.json']);

      const status = runScript(repo, {
        message: 'chore(release): v2.8.1 [skip ci]',
      });

      expect(status).toBe(SKIP);
    });
  });

  describe('non-release commits', () => {
    it('should build a feat commit that changes web files', () => {
      repo = createRepo(['apps/web/src/app/page.tsx']);

      const status = runScript(repo, {
        message: 'feat(web): add page',
        previousSha: repo.previousSha,
      });

      expect(status).toBe(BUILD);
    });

    it('should build a back-merge commit that changes web files', () => {
      repo = createRepo(['apps/web/package.json']);

      const status = runScript(repo, {
        message: 'chore: back-merge main into develop [skip ci]',
        previousSha: repo.previousSha,
      });

      expect(status).toBe(BUILD);
    });

    it('should build when chore(release): appears only inside the message', () => {
      repo = createRepo(['apps/web/src/app/page.tsx']);

      const status = runScript(repo, {
        message: 'fix: handle chore(release): text',
        previousSha: repo.previousSha,
      });

      expect(status).toBe(BUILD);
    });
  });

  describe('denylist and guards', () => {
    it('should skip the build when only denylisted files changed', () => {
      repo = createRepo([
        'apps/api/src/main.ts',
        'openspec/changes/example/proposal.md',
        'docs/guide.md',
        'Dockerfile',
        '.dockerignore',
        '.github/workflows/deploy-api.yml',
      ]);

      const status = runScript(repo, {
        message: 'fix(api): change api only',
        previousSha: repo.previousSha,
      });

      expect(status).toBe(SKIP);
    });

    it('should build when denylisted and web files changed together', () => {
      repo = createRepo(['apps/api/src/main.ts', 'apps/web/src/app/page.tsx']);

      const status = runScript(repo, {
        message: 'feat: change api and web',
        previousSha: repo.previousSha,
      });

      expect(status).toBe(BUILD);
    });

    it('should build when the previous SHA is missing', () => {
      repo = createRepo(['apps/api/src/main.ts']);

      const status = runScript(repo, { message: 'fix(api): change api only' });

      expect(status).toBe(BUILD);
    });

    it('should build when the previous SHA cannot be resolved', () => {
      repo = createRepo(['apps/api/src/main.ts']);

      const status = runScript(repo, {
        message: 'fix(api): change api only',
        previousSha: '0123456789abcdef0123456789abcdef01234567',
      });

      expect(status).toBe(BUILD);
    });
  });
});
