/**
 * @jest-environment node
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts/detect-api-image-changes.sh');
const PATTERN_PATH = path.join(REPO_ROOT, 'scripts/api-image-inputs.pattern');
const DEPLOY_WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/deploy-api.yml');

const ZERO_SHA = '0000000000000000000000000000000000000000';
const UNKNOWN_SHA = '0123456789abcdef0123456789abcdef01234567';

interface Repo {
  dir: string;
  baseSha: string;
  headSha: string;
}

interface RunResult {
  status: number | null;
  build: string | undefined;
  stdout: string;
  summary: string;
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-api-image-'));
  git(dir, ['init', '--quiet']);
  writeFiles(dir, ['README.txt'], 'base');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', 'base']);
  const baseSha = git(dir, ['rev-parse', 'HEAD']);

  writeFiles(dir, changedFiles, 'changed');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', 'change']);
  const headSha = git(dir, ['rev-parse', 'HEAD']);

  return { dir, baseSha, headSha };
}

function runScript(repo: Repo, env: { baseSha?: string; headSha?: string }): RunResult {
  const outputPath = path.join(repo.dir, '.github-output');
  const summaryPath = path.join(repo.dir, '.github-summary');
  // Minimal environment so the host's CI variables never leak into the script.
  const scriptEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    PATH: process.env.PATH ?? '',
    HEAD_SHA: env.headSha ?? repo.headSha,
    GITHUB_OUTPUT: outputPath,
    GITHUB_STEP_SUMMARY: summaryPath,
  };
  if (env.baseSha !== undefined) {
    scriptEnv.BASE_SHA = env.baseSha;
  }
  const result = spawnSync('bash', [SCRIPT_PATH], {
    cwd: repo.dir,
    env: scriptEnv,
    encoding: 'utf8',
  });
  const output = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  const summary = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, 'utf8') : '';
  return {
    status: result.status,
    build: /^build=(.*)$/m.exec(output)?.[1],
    stdout: result.stdout,
    summary,
  };
}

describe('scripts/detect-api-image-changes.sh', () => {
  let repo: Repo | undefined;

  afterEach(() => {
    if (repo) {
      fs.rmSync(repo.dir, { recursive: true, force: true });
      repo = undefined;
    }
  });

  describe('shared image inputs', () => {
    it.each([
      'apps/api/src/main.ts',
      'apps/api/src/café.ts',
      'packages/shared/src/index.ts',
      'Dockerfile',
      '.dockerignore',
      'package.json',
      'package-lock.json',
      '.npmrc',
      '.nvmrc',
      'nx.json',
      'tsconfig.base.json',
      'tsconfig.json',
      '.github/workflows/deploy-api.yml',
    ])('should build when %s changed', (file) => {
      repo = createRepo([file]);

      const result = runScript(repo, { baseSha: repo.baseSha });

      expect(result.status).toBe(0);
      expect(result.build).toBe('true');
    });
  });

  describe('CI-only inputs', () => {
    it.each([
      '.github/workflows/ci.yml',
      'scripts/api-image-inputs.pattern',
      'scripts/detect-api-image-changes.sh',
    ])('should build when %s changed', (file) => {
      repo = createRepo([file]);

      const result = runScript(repo, { baseSha: repo.baseSha });

      expect(result.build).toBe('true');
    });

    it('should not match the CI-only inputs in the shared pattern file', () => {
      const pattern = new RegExp(fs.readFileSync(PATTERN_PATH, 'utf8').trim());

      expect(pattern.test('.github/workflows/ci.yml')).toBe(false);
      expect(pattern.test('scripts/api-image-inputs.pattern')).toBe(false);
      expect(pattern.test('scripts/detect-api-image-changes.sh')).toBe(false);
    });
  });

  describe('files that are not image inputs', () => {
    it.each([
      'apps/web/src/app/page.tsx',
      'docs/guide.md',
      'README.md',
      'openspec/changes/example/proposal.md',
    ])('should not build when only %s changed', (file) => {
      repo = createRepo([file]);

      const result = runScript(repo, { baseSha: repo.baseSha });

      expect(result.status).toBe(0);
      expect(result.build).toBe('false');
    });

    it('should build when image inputs and other files changed together', () => {
      repo = createRepo(['apps/web/src/app/page.tsx', 'apps/api/src/main.ts']);

      const result = runScript(repo, { baseSha: repo.baseSha });

      expect(result.build).toBe('true');
    });
  });

  describe('fail-safe to build', () => {
    it('should build when the base SHA is missing', () => {
      repo = createRepo(['docs/guide.md']);

      const result = runScript(repo, {});

      expect(result.status).toBe(0);
      expect(result.build).toBe('true');
    });

    it('should build when the base SHA is empty', () => {
      repo = createRepo(['docs/guide.md']);

      const result = runScript(repo, { baseSha: '' });

      expect(result.build).toBe('true');
    });

    it('should build when the base SHA is all zeros', () => {
      repo = createRepo(['docs/guide.md']);

      const result = runScript(repo, { baseSha: ZERO_SHA });

      expect(result.build).toBe('true');
    });

    it('should build when the base SHA cannot be resolved', () => {
      repo = createRepo(['docs/guide.md']);

      const result = runScript(repo, { baseSha: UNKNOWN_SHA });

      expect(result.build).toBe('true');
    });

    it('should build when git diff fails', () => {
      repo = createRepo(['docs/guide.md']);

      const result = runScript(repo, { baseSha: repo.baseSha, headSha: UNKNOWN_SHA });

      expect(result.status).toBe(0);
      expect(result.build).toBe('true');
    });
  });

  describe('reporting', () => {
    it('should print the matched files and the decision', () => {
      repo = createRepo(['apps/api/src/main.ts']);

      const result = runScript(repo, { baseSha: repo.baseSha });

      expect(result.stdout).toContain('Matched files: apps/api/src/main.ts');
      expect(result.stdout).toContain('Decision: build=true');
      expect(result.summary).toContain('**build=true**');
    });

    it('should state in the summary that no image inputs changed', () => {
      repo = createRepo(['docs/guide.md']);

      const result = runScript(repo, { baseSha: repo.baseSha });

      expect(result.summary).toContain('**build=false** (no API image inputs changed)');
    });

    it('should write the decision to stdout when no output files are set', () => {
      repo = createRepo(['docs/guide.md']);

      const result = spawnSync('bash', [SCRIPT_PATH], {
        cwd: repo.dir,
        env: {
          NODE_ENV: 'test',
          PATH: process.env.PATH ?? '',
          BASE_SHA: repo.baseSha,
          HEAD_SHA: repo.headSha,
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Decision: build=false');
    });
  });
});

describe('.github/workflows/deploy-api.yml', () => {
  const workflow = fs.readFileSync(DEPLOY_WORKFLOW_PATH, 'utf8');

  it('should read the shared image input list from the pattern file', () => {
    expect(workflow).toContain('scripts/api-image-inputs.pattern');
  });

  it('should not inline the image input list', () => {
    expect(workflow).not.toContain("PATTERN='");
  });
});
