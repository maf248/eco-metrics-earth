/**
 * @jest-environment node
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

interface Decision {
  skip: boolean;
  reason: string;
  matched: string[];
  nonDocs: string[];
  needsBaseCheck: boolean;
}

interface BaseCheck {
  conclusions?: Array<string | null>;
  error?: string;
}

interface DecideInputs {
  doubt?: string;
  changedFiles?: string[];
  patterns?: RegExp[];
  baseCheck?: BaseCheck;
}

interface RunDeps {
  env: Record<string, string | undefined>;
  git: (args: string[]) => { status: number; stdout: string };
  fetch: (url: string, init: RequestInit) => Promise<FetchResponse>;
  stdout: (line: string) => void;
  appendFile: (file: string, text: string) => void;
}

// Loaded through Node's own require: the project's tsconfig does not include scripts/.
const detector = createRequire(__filename)('../../../../scripts/detect-e2e-skip.cjs') as {
  decide: (inputs: DecideInputs) => Decision;
  run: (deps: RunDeps) => Promise<Decision>;
};
const { decide, run } = detector;

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts/detect-e2e-skip.cjs');
const PATTERN_PATH = path.join(REPO_ROOT, 'scripts/docs-only-paths.pattern');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/ci.yml');

const CHECK_NAME = 'Format, Lint, Typecheck, Build & Test';
const ZERO_SHA = '0000000000000000000000000000000000000000';
const UNKNOWN_SHA = '0123456789abcdef0123456789abcdef01234567';
const DOCS_FILES = ['README.md', 'docs/guide.md', 'openspec/changes/x/proposal.md'];

interface Repo {
  dir: string;
  baseSha: string;
  headSha: string;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

type FetchImpl = (url: string, init: RequestInit) => Promise<FetchResponse>;

interface Outcome {
  skip: boolean;
  reason: string;
  output: string;
  summary: string;
  stdout: string;
  fetchCalls: Array<{ url: string; init: RequestInit }>;
}

function git(cwd: string, args: string[]): string {
  const result = spawnSync(
    'git',
    [
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'tag.gpgsign=false',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

/**
 * Creates a repo with a base commit followed by one commit per entry of `commits`.
 * The base commit holds the docs-only pattern (`basePattern`, the real one by default;
 * `null` leaves it out), because the detector reads it from the base revision.
 */
function createRepo(
  commits: string[][],
  basePattern: string | null = fs.readFileSync(PATTERN_PATH, 'utf8'),
): Repo {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-e2e-skip-'));
  git(dir, ['init', '--quiet']);
  fs.writeFileSync(path.join(dir, 'base.txt'), 'base');
  if (basePattern !== null) {
    fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'scripts/docs-only-paths.pattern'), basePattern);
  }
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', 'base']);
  const baseSha = git(dir, ['rev-parse', 'HEAD']);

  commits.forEach((files, index) => {
    for (const file of files) {
      const target = path.join(dir, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `change ${index}`);
    }
    git(dir, ['add', '-A']);
    git(dir, ['commit', '--quiet', '-m', `change ${index}`]);
  });

  return { dir, baseSha, headSha: git(dir, ['rev-parse', 'HEAD']) };
}

function checkRuns(...conclusions: Array<string | null>): FetchImpl {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      check_runs: conclusions.map((conclusion) => ({ name: CHECK_NAME, conclusion })),
    }),
  });
}

interface Options {
  baseSha?: string;
  headSha?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchImpl;
}

async function detect(repo: Repo, options: Options = {}): Promise<Outcome> {
  const outputPath = path.join(repo.dir, '.github-output');
  const summaryPath = path.join(repo.dir, '.github-summary');
  const fetchCalls: Outcome['fetchCalls'] = [];
  const fetchImpl = options.fetchImpl ?? checkRuns('success');
  const stdoutLines: string[] = [];

  const decision = await run({
    env: {
      BASE_SHA: options.baseSha ?? repo.baseSha,
      HEAD_SHA: options.headSha ?? repo.headSha,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: summaryPath,
      GITHUB_TOKEN: 'token',
      GITHUB_REPOSITORY: 'owner/repo',
      CI_CHECK_NAME: CHECK_NAME,
      ...options.env,
    },
    git: (args: string[]) => {
      const result = spawnSync('git', args, { cwd: repo.dir, encoding: 'utf8' });
      return { status: result.status ?? 1, stdout: result.stdout ?? '' };
    },
    fetch: async (url: string, init: RequestInit) => {
      fetchCalls.push({ url, init });
      return fetchImpl(url, init);
    },
    stdout: (line: string) => stdoutLines.push(line),
    appendFile: (file: string, text: string) => fs.appendFileSync(file, text),
  });

  const read = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
  return {
    skip: decision.skip,
    reason: decision.reason,
    output: read(outputPath),
    summary: read(summaryPath),
    stdout: stdoutLines.join('\n'),
    fetchCalls,
  };
}

describe('scripts/detect-e2e-skip.cjs', () => {
  let repo: Repo | undefined;

  afterEach(() => {
    if (repo) {
      fs.rmSync(repo.dir, { recursive: true, force: true });
      repo = undefined;
    }
  });

  describe('decide', () => {
    const patterns = [/\.md$/, /^openspec\//];
    const green = { conclusions: ['success'] };

    it('should skip a docs-only diff on a green base', () => {
      const result = decide({ changedFiles: DOCS_FILES, patterns, baseCheck: green });

      expect(result.skip).toBe(true);
      expect(result.matched).toEqual(DOCS_FILES);
      expect(result.nonDocs).toEqual([]);
    });

    it('should request the base check for a docs-only diff that has not been verified', () => {
      const result = decide({ changedFiles: DOCS_FILES, patterns });

      expect(result.skip).toBe(false);
      expect(result.needsBaseCheck).toBe(true);
    });

    it('should run and list the non-docs files when a single path does not match', () => {
      const result = decide({
        changedFiles: ['docs/guide.md', 'apps/api/src/main.ts'],
        patterns,
        baseCheck: green,
      });

      expect(result.skip).toBe(false);
      expect(result.needsBaseCheck).toBe(false);
      expect(result.nonDocs).toEqual(['apps/api/src/main.ts']);
    });

    it('should run when the diff is empty', () => {
      expect(decide({ changedFiles: [], patterns, baseCheck: green }).skip).toBe(false);
    });

    it('should run when a doubt is reported, even for a docs-only diff on a green base', () => {
      const result = decide({
        doubt: 'git diff failed',
        changedFiles: DOCS_FILES,
        patterns,
        baseCheck: green,
      });

      expect(result.skip).toBe(false);
      expect(result.reason).toBe('git diff failed');
    });

    it.each([
      ['failure', ['failure']],
      ['cancelled', ['cancelled']],
      ['in progress', [null]],
      ['no check run', []],
      ['a failed push run next to a green pull_request run', ['failure', 'success']],
    ])('should run when the base check is %s', (_label, conclusions) => {
      const result = decide({ changedFiles: DOCS_FILES, patterns, baseCheck: { conclusions } });

      expect(result.skip).toBe(false);
    });

    it('should skip when every latest check run succeeded', () => {
      const result = decide({
        changedFiles: DOCS_FILES,
        patterns,
        baseCheck: { conclusions: ['success', 'success'] },
      });

      expect(result.skip).toBe(true);
    });

    it('should run when the base check could not be read', () => {
      const result = decide({
        changedFiles: DOCS_FILES,
        patterns,
        baseCheck: { error: 'GitHub API answered 403' },
      });

      expect(result.skip).toBe(false);
      expect(result.reason).toContain('GitHub API answered 403');
    });
  });

  describe('docs-only diff', () => {
    it('should skip E2E with a green base', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo);

      expect(result.skip).toBe(true);
      expect(result.output).toBe('skip_e2e=true\n');
    });

    it('should skip E2E when the latest attempt of a re-run succeeded', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { fetchImpl: checkRuns('success') });

      expect(result.skip).toBe(true);
    });

    it.each([
      ['failure', ['failure']],
      ['cancelled', ['cancelled']],
      ['in_progress', [null]],
      ['a failed push run with a green pull_request run', ['failure', 'success']],
      ['no check run', []],
    ])('should run E2E when the base check is %s', async (_label, conclusions) => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { fetchImpl: checkRuns(...conclusions) });

      expect(result.skip).toBe(false);
      expect(result.output).toBe('skip_e2e=false\n');
    });

    it('should name the base conclusion in the reason when the base check failed', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { fetchImpl: checkRuns('failure') });

      expect(result.reason).toContain('failure');
    });

    it('should query the latest check runs of the base commit by check name', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo);

      expect(result.fetchCalls).toHaveLength(1);
      const { url, init } = result.fetchCalls[0];
      expect(url).toBe(
        `https://api.github.com/repos/owner/repo/commits/${repo.baseSha}/check-runs` +
          `?check_name=${encodeURIComponent(CHECK_NAME)}&filter=latest&app_id=15368&per_page=100`,
      );
      expect(init.headers).toEqual({
        Authorization: 'Bearer token',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('should use GITHUB_API_URL and the check name from the environment', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, {
        env: { GITHUB_API_URL: 'https://ghe.example.com/api/v3', CI_CHECK_NAME: 'Other job' },
      });

      expect(result.fetchCalls[0].url).toContain('https://ghe.example.com/api/v3/repos/owner/repo');
      expect(result.fetchCalls[0].url).toContain(`check_name=${encodeURIComponent('Other job')}`);
    });
  });

  describe('diffs that contain code', () => {
    it('should run E2E without calling the API when code changed', async () => {
      repo = createRepo([['apps/api/src/main.ts', 'docs/guide.md']]);

      const result = await detect(repo);

      expect(result.skip).toBe(false);
      expect(result.fetchCalls).toHaveLength(0);
      expect(result.stdout).toContain('Non-docs files: apps/api/src/main.ts');
    });

    it('should run E2E on a multi-commit push whose last commit is docs-only', async () => {
      repo = createRepo([['apps/web/src/a.ts'], ['apps/web/src/b.ts'], ['docs/guide.md']]);

      const result = await detect(repo);

      expect(result.skip).toBe(false);
      expect(result.fetchCalls).toHaveLength(0);
    });

    it.each([
      '.github/workflows/ci.yml',
      'scripts/docs-only-paths.pattern',
      'scripts/detect-e2e-skip.cjs',
    ])('should run E2E when %s changed', async (file) => {
      repo = createRepo([[file]]);

      const result = await detect(repo);

      expect(result.skip).toBe(false);
    });

    it.each([
      '.github/workflows/ci.yml',
      'scripts/docs-only-paths.pattern',
      'scripts/detect-e2e-skip.cjs',
    ])('should run E2E when %s changed even if the base pattern matches it', async (file) => {
      repo = createRepo([[file]], '.');

      const result = await detect(repo);

      expect(result.skip).toBe(false);
      expect(result.stdout).toContain(`Non-docs files: ${file}`);
    });

    it('should run E2E when a code file is renamed to a docs path', async () => {
      repo = createRepo([]);
      fs.mkdirSync(path.join(repo.dir, 'apps/api/src'), { recursive: true });
      fs.writeFileSync(path.join(repo.dir, 'apps/api/src/x.ts'), 'export const x = 1;');
      git(repo.dir, ['add', '-A']);
      git(repo.dir, ['commit', '--quiet', '-m', 'add code']);
      const baseSha = git(repo.dir, ['rev-parse', 'HEAD']);
      fs.mkdirSync(path.join(repo.dir, 'docs'), { recursive: true });
      git(repo.dir, ['mv', 'apps/api/src/x.ts', 'docs/x.md']);
      git(repo.dir, ['commit', '--quiet', '-m', 'rename']);
      const headSha = git(repo.dir, ['rev-parse', 'HEAD']);

      const result = await detect(repo, { baseSha, headSha });

      expect(result.skip).toBe(false);
      expect(result.stdout).toContain('Non-docs files: apps/api/src/x.ts');
      expect(result.stdout).toContain('docs/x.md');
      expect(result.fetchCalls).toHaveLength(0);
    });

    it('should use the pattern of the base revision when the head widens it', async () => {
      repo = createRepo([]);
      fs.writeFileSync(path.join(repo.dir, 'scripts/docs-only-paths.pattern'), '.\n');
      fs.mkdirSync(path.join(repo.dir, 'apps/api/src'), { recursive: true });
      fs.writeFileSync(path.join(repo.dir, 'apps/api/src/main.ts'), 'code');
      git(repo.dir, ['add', '-A']);
      git(repo.dir, ['commit', '--quiet', '-m', 'widen pattern and edit code']);
      const headSha = git(repo.dir, ['rev-parse', 'HEAD']);

      const result = await detect(repo, { headSha });

      expect(result.skip).toBe(false);
      expect(result.fetchCalls).toHaveLength(0);
    });
  });

  describe('fail-safe to run', () => {
    it.each([
      ['rejects', async () => Promise.reject(new Error('network down'))],
      ['times out', async () => Promise.reject(new DOMException('timed out', 'TimeoutError'))],
      ['answers non-2xx', async () => ({ ok: false, status: 403, json: async () => ({}) })],
      [
        'answers an unparsable body',
        async () => ({
          ok: true,
          status: 200,
          json: async () => Promise.reject(new SyntaxError('Unexpected token')),
        }),
      ],
      [
        'answers an unexpected shape',
        async () => ({ ok: true, status: 200, json: async () => ({ check_runs: 'none' }) }),
      ],
    ])('should run E2E when the API call %s', async (_label, fetchImpl) => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { fetchImpl });

      expect(result.skip).toBe(false);
      expect(result.reason).toContain('base check');
    });

    it.each([undefined, '', ZERO_SHA])('should run E2E when the base SHA is %p', async (base) => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { baseSha: base ?? '' });

      expect(result.skip).toBe(false);
      expect(result.reason).toBe('no base revision to compare against');
      expect(result.fetchCalls).toHaveLength(0);
    });

    it('should run E2E without calling the API when the base is not in history', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { baseSha: UNKNOWN_SHA });

      expect(result.skip).toBe(false);
      expect(result.fetchCalls).toHaveLength(0);
    });

    it('should run E2E when git diff fails', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { headSha: UNKNOWN_SHA });

      expect(result.skip).toBe(false);
      expect(result.reason).toBe('git diff failed');
    });

    it('should run E2E when the diff is empty', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { baseSha: repo.headSha });

      expect(result.skip).toBe(false);
      expect(result.fetchCalls).toHaveLength(0);
    });

    it('should run E2E when the base revision has no pattern file', async () => {
      repo = createRepo([DOCS_FILES], null);

      const result = await detect(repo);

      expect(result.skip).toBe(false);
      expect(result.reason).toBe(
        'the docs-only pattern is missing or invalid at the base revision',
      );
      expect(result.fetchCalls).toHaveLength(0);
    });

    it.each([['(\n'], ['']])(
      'should run E2E when the base pattern file holds %p',
      async (content) => {
        repo = createRepo([DOCS_FILES], content);

        const result = await detect(repo);

        expect(result.skip).toBe(false);
        expect(result.fetchCalls).toHaveLength(0);
      },
    );

    it('should run E2E when the API reports more check runs than it returned', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, {
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            total_count: 101,
            check_runs: [{ name: CHECK_NAME, conclusion: 'success' }],
          }),
        }),
      });

      expect(result.skip).toBe(false);
      expect(result.reason).toContain('truncated');
    });

    it.each(['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'CI_CHECK_NAME'])(
      'should run E2E without calling the API when %s is missing',
      async (variable) => {
        repo = createRepo([DOCS_FILES]);

        const result = await detect(repo, { env: { [variable]: undefined } });

        expect(result.skip).toBe(false);
        expect(result.reason).toContain(variable);
        expect(result.fetchCalls).toHaveLength(0);
      },
    );
  });

  describe('docs-only pattern file', () => {
    const pattern = new RegExp(fs.readFileSync(PATTERN_PATH, 'utf8').trim());

    it.each(['README.md', 'docs/guide.md', 'openspec/changes/x/proposal.md', 'openspec/x.json'])(
      'should match %s',
      (file) => {
        expect(pattern.test(file)).toBe(true);
      },
    );

    it.each([
      'apps/api/src/main.ts',
      '.github/workflows/ci.yml',
      'scripts/docs-only-paths.pattern',
      'scripts/detect-e2e-skip.cjs',
      'package.json',
    ])('should not match %s', (file) => {
      expect(pattern.test(file)).toBe(false);
    });
  });

  describe('reporting', () => {
    it('should report base, head, files, conclusion, decision and reason on a skip', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo);

      for (const text of [result.stdout, result.summary]) {
        expect(text).toContain(repo.baseSha);
        expect(text).toContain(repo.headSha);
        expect(text).toContain('README.md');
        expect(text).toContain('Non-docs files: none');
        expect(text).toContain('Base check conclusion: success');
        expect(text).toContain('skip_e2e=true');
        expect(text).toContain('docs-only diff and the base check concluded success');
      }
    });

    it('should report the base check state in the reason of a run', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, { fetchImpl: checkRuns(null) });

      expect(result.summary).toContain('**skip_e2e=false**');
      expect(result.summary).toContain('in progress');
    });

    it('should not fail when no output files are configured', async () => {
      repo = createRepo([DOCS_FILES]);

      const result = await detect(repo, {
        env: { GITHUB_OUTPUT: undefined, GITHUB_STEP_SUMMARY: undefined },
      });

      expect(result.skip).toBe(true);
      expect(result.stdout).toContain('Decision: skip_e2e=true');
    });
  });

  describe('command line', () => {
    it('should exit 0 and report a run when the token is missing', () => {
      repo = createRepo([DOCS_FILES]);
      const outputPath = path.join(repo.dir, '.github-output');

      const result = spawnSync('node', [SCRIPT_PATH], {
        cwd: repo.dir,
        env: {
          NODE_ENV: 'test',
          PATH: process.env.PATH ?? '',
          BASE_SHA: repo.baseSha,
          HEAD_SHA: repo.headSha,
          GITHUB_OUTPUT: outputPath,
        },
        encoding: 'utf8',
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Decision: skip_e2e=false');
      expect(fs.readFileSync(outputPath, 'utf8')).toBe('skip_e2e=false\n');
    });

    it('should exit 0 outside a git repository', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-e2e-skip-nogit-'));
      try {
        const result = spawnSync('node', [SCRIPT_PATH], {
          cwd: dir,
          env: {
            NODE_ENV: 'test',
            PATH: process.env.PATH ?? '',
            BASE_SHA: UNKNOWN_SHA,
            HEAD_SHA: UNKNOWN_SHA,
          },
          encoding: 'utf8',
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Decision: skip_e2e=false');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});

describe('.github/workflows/ci.yml E2E gate', () => {
  const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const ciJob = workflow.slice(workflow.indexOf('\n  ci:\n'), workflow.indexOf('\n  api-image:'));
  const jobHeader = ciJob.slice(0, ciJob.indexOf('\n    steps:'));
  const steps = ciJob
    .slice(ciJob.indexOf('\n    steps:'))
    .split(/\n {6}- (?=name:|uses:)/)
    .slice(1);
  const stepNamed = (name: string) => steps.find((step) => step.startsWith(`name: ${name}\n`));

  it('should gate only the E2E step on the detector output', () => {
    expect(stepNamed('E2E')).toContain("if: steps.e2e_gate.outputs.skip_e2e != 'true'");
  });

  it('should run the detector in a step with id e2e_gate right before E2E', () => {
    const index = steps.findIndex((step) => step.startsWith('name: E2E\n'));

    expect(steps[index - 1]).toContain('id: e2e_gate');
    expect(steps[index - 1]).toContain('run: node scripts/detect-e2e-skip.cjs');
  });

  it('should not put an if on the ci job or on any other step', () => {
    expect(jobHeader).not.toMatch(/^ {4}if:/m);
    const gated = steps.filter((step) => /^ {8}if:/m.test(step));
    expect(gated).toHaveLength(1);
    expect(gated[0]).toMatch(/^name: E2E\n/);
  });

  it('should always run the format, lint, typecheck, build, prune and test steps', () => {
    for (const name of ['Format check', 'Lint', 'Typecheck', 'Build', 'Test']) {
      expect(stepNamed(name)).toBeDefined();
      expect(stepNamed(name)).not.toMatch(/^ {8}if:/m);
    }
    const prune = steps.filter((step) => /^name: Verify API production install/.test(step));
    expect(prune).toHaveLength(2);
  });

  it('should grant contents and checks read permissions to the job', () => {
    expect(jobHeader).toMatch(/\n {4}permissions:\n {6}contents: read\n {6}checks: read\n/);
  });

  it('should pass the job name to the detector as CI_CHECK_NAME', () => {
    const jobName = /^ {4}name: (.+)$/m.exec(jobHeader)?.[1];
    const checkName = /^ {10}CI_CHECK_NAME: (.+)$/m.exec(ciJob)?.[1];

    expect(jobName).toBe(CHECK_NAME);
    expect(checkName).toBe(jobName);
  });

  it('should not use paths-ignore', () => {
    expect(workflow).not.toContain('paths-ignore');
  });
});
