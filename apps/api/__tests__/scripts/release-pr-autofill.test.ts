import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  MARKER,
  bump,
  buildBody,
  buildTitle,
  collectTopics,
  groupCommits,
  parseCommit,
  readDeployTargets,
  sanitizeSubject,
  type DeployTargets,
  type ListedCommit,
  type StreamRelease,
} from '../../../../scripts/release-pr-autofill.mjs';

const ROOT = join(__dirname, '../../../..');
const SCRIPT = join(ROOT, 'scripts/release-pr-autofill.mjs');

/**
 * Fixed ES module run with `node -e`: argv is `[script, scenario, ...run() arguments]`. It calls
 * `run()` with a spawn that fails the way the scenario names, and mirrors the entry point's catch.
 */
const FAILING_SPAWN_DRIVER = `
import { pathToFileURL } from 'node:url';
const [script, scenario, ...args] = process.argv.slice(1);
const spawns = {
  status: () => ({ status: 2, stderr: 'boom' }),
  'spawn-error': () => ({ status: null, error: new Error('ENOENT') }),
  'vercel-ignore': (command) =>
    command === 'grep' ? { status: 1, stderr: '' } : { status: 2, stderr: 'bad' },
};
try {
  if (!Object.hasOwn(spawns, scenario)) throw new Error('Unknown scenario: ' + scenario);
  const { run } = await import(pathToFileURL(script).href);
  await run(args, spawns[scenario]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
`;
const WORKFLOW = readFileSync(join(ROOT, '.github/workflows/release-pr-autofill.yml'), 'utf8')
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n');

const commit = (subject: string, hash = 'abcdef0123456789'): ListedCommit => ({ hash, subject });
const commitsOf = (...subjects: string[]): ListedCommit[] => subjects.map((s) => commit(s));

const API: DeployTargets = { api: true, web: false };
const WEB: DeployTargets = { api: false, web: true };
const BOTH: DeployTargets = { api: true, web: true };
const NEITHER: DeployTargets = { api: false, web: false };

const NO_RELEASES: StreamRelease[] = [
  { label: 'Root', prefix: 'v', type: null, last: '3.1.0', next: null },
  { label: 'Web', prefix: 'web-v', type: null, last: '2.4.0', next: null },
  { label: 'API', prefix: 'api-v', type: null, last: '1.2.0', next: null },
];

describe('parseCommit', () => {
  it('should split type, comma-separated scopes and description', () => {
    expect(parseCommit('Fix(Web, API): do it')).toEqual({
      type: 'fix',
      scopes: ['web', 'api'],
      description: 'do it',
      breaking: false,
    });
  });

  it('should flag the bang and treat other subjects as non-conventional', () => {
    expect(parseCommit('feat(web)!: x').breaking).toBe(true);
    expect(parseCommit('update stuff')).toMatchObject({ type: null, scopes: [] });
  });
});

describe('bump', () => {
  it('should bump each release type', () => {
    expect(bump('3.1.4', 'major')).toBe('4.0.0');
    expect(bump('3.1.4', 'minor')).toBe('3.2.0');
    expect(bump('3.1.4', 'patch')).toBe('3.1.5');
  });
});

describe('collectTopics', () => {
  it('should order by frequency, then by first appearance, ignoring unscoped commits', () => {
    const commits = commitsOf(
      'fix(api): a',
      'feat(web): b',
      'feat(tooling): c',
      'feat(web): d',
      'fix(tooling, web): e',
      'update stuff',
    );
    expect(collectTopics(commits)).toEqual(['web', 'tooling', 'api']);
  });
});

describe('buildTitle', () => {
  it('should name the version and the ordered topics', () => {
    expect(buildTitle('3.2.0', ['web', 'tooling', 'api'])).toBe(
      'Release v3.2.0: web, tooling, api',
    );
  });

  it('should fall back when there is no root release or no topics', () => {
    expect(buildTitle(null, ['docs'])).toBe('Release: docs');
    expect(buildTitle('3.2.0', [])).toBe('Release v3.2.0');
    expect(buildTitle(undefined, [])).toBe('Release');
  });

  it('should drop topics that do not fit and count them', () => {
    const topics = ['alpha-topic', 'bravo-topic', 'charlie-topic', 'delta-topic', 'echo-topic'];
    const title = buildTitle('3.2.0', topics);
    expect(title.length).toBeLessThanOrEqual(72);
    expect(title).toMatch(/, \+\d+ more$/);
    expect(title.startsWith('Release v3.2.0: alpha-topic')).toBe(true);
  });

  it('should allow a title of exactly 72 characters without dropping anything', () => {
    const title = buildTitle('3.2.0', ['a'.repeat(56)]);
    expect(title).toHaveLength(72);
    expect(title).toBe(`Release v3.2.0: ${'a'.repeat(56)}`);
  });

  it('should drop the topics that do not fit and report the exact count', () => {
    const topics = ['alpha-topic', 'bravo-topic', 'charlie-topic', 'delta-topic', 'echo-topic'];
    expect(buildTitle('3.2.0', topics)).toBe(
      'Release v3.2.0: alpha-topic, bravo-topic, charlie-topic, +2 more',
    );
  });

  it('should truncate the first topic when it alone does not fit', () => {
    const title = buildTitle('3.2.0', ['x'.repeat(100), 'other']);
    expect(title).toHaveLength(72);
    expect(title).toContain('…');
    expect(title.endsWith(', +1 more')).toBe(true);
    expect(buildTitle('3.2.0', ['y'.repeat(100)])).toHaveLength(72);
  });

  it.each(['breaking change', 'Breaking-Changes', 'BREAKING_CHANGE', 'breakingchange'])(
    'should never let the topic "%s" reach the title',
    (topic) => {
      const title = buildTitle('4.0.0', ['web', topic]);
      expect(title).not.toMatch(/breaking[\s_-]*changes?/i);
      expect(title).toBe('Release v4.0.0: web');
    },
  );

  it('should keep the title on one line', () => {
    const title = buildTitle('3.2.0', ['web\nbreaking\nchange', 'api']);
    expect(title).not.toMatch(/\n/);
    expect(title).not.toMatch(/breaking[\s_-]*changes?/i);
  });

  it.each([
    ['breaking change', 'fix(breaking change): a'],
    ['breaking-changes', 'feat(Breaking-Changes): b'],
    ['breaking_change', 'fix(BREAKING_CHANGE): c'],
    ['breaking--changes', 'fix(breaking--changes): d'],
    ['breaking\tchange', 'fix(breaking\tchange): e'],
  ])('should drop a scope "%s" when it comes from a commit subject', (_label, subject) => {
    const topics = collectTopics([commit(subject), commit('fix(web): f'), commit('feat(api): g')]);
    const title = buildTitle('4.0.0', topics);
    expect(title).not.toMatch(/breaking[\s_-]*changes?/i);
    expect(title).not.toMatch(/\n/);
    expect(title).toBe('Release v4.0.0: web, api');
  });

  it('should keep breaking words that are not the keyword phrase', () => {
    expect(buildTitle('3.2.0', ['breaking', 'change', 'web'])).toBe(
      'Release v3.2.0: breaking, change, web',
    );
  });
});

describe('groupCommits', () => {
  it('should group in display order, omit empty groups and send the rest to Other', () => {
    const groups = groupCommits(
      commitsOf('update stuff', 'fix(api): b', 'ci(tooling): c', 'feat(web): a', 'chore: d'),
    );
    expect(groups.map((g) => g.heading)).toEqual(['Features', 'Fixes', 'Chores/Tooling', 'Other']);
    expect(groups[2].commits).toHaveLength(2);
  });
});

describe('sanitizeSubject', () => {
  it('should emit one code span with no inner backtick', () => {
    expect(sanitizeSubject('fix(api): thanks @someone for #12 and `code`')).toBe(
      "`fix(api): thanks @someone for #12 and 'code'`",
    );
  });
});

describe('buildBody', () => {
  const build = (
    commits: ListedCommit[],
    deploys: DeployTargets = NEITHER,
    maxLength?: number,
  ): string =>
    buildBody({
      releases: NO_RELEASES,
      deploys,
      commits,
      head: 'abc1234',
      maxLength,
    });

  it('should start with the marker, even for an empty commit set', () => {
    const body = build([]);
    expect(body.startsWith(`${MARKER}\n`)).toBe(true);
    expect(body).toContain('if this PR is merged as it is');
    expect(body).toContain('No commits.');
  });

  it('should list releases, deploys and commits in order', () => {
    const releases: StreamRelease[] = [
      { label: 'Root', prefix: 'v', type: 'minor', last: '3.1.0', next: '3.2.0' },
      { label: 'Web', prefix: 'web-v', type: 'patch', last: null, next: '0.0.1' },
      NO_RELEASES[2],
    ];
    const body = buildBody({
      releases,
      deploys: BOTH,
      commits: commitsOf('feat(web): a'),
      head: 'abc1234',
    });
    expect(body).toContain('minor release to `v3.2.0` (from `v3.1.0`)');
    expect(body).toContain('first release');
    expect(body).toContain('- **API** (`api-v`): no release');
    expect(body).toContain('- API and web.');
    expect(body).toContain('waits for the API production deploy');
    expect(body.indexOf('## Releases')).toBeLessThan(body.indexOf('## Deploys'));
    expect(body.indexOf('## Deploys')).toBeLessThan(body.indexOf('## Commits'));
  });

  it('should state a single deploy target without the waiting line', () => {
    const webOnly = build([], WEB);
    expect(webOnly).toContain('- Web only.');
    expect(webOnly).not.toContain('waits for');
    expect(build([], API)).toContain('- API only.');
    expect(build([], NEITHER)).toContain('- Neither API nor web.');
  });

  it('should group commits under their headings with the short hash', () => {
    const body = build(commitsOf('feat(web): a', 'fix(api): b', 'update stuff'));
    expect(body).toContain('### Features\n\n- `abcdef0` `feat(web): a`');
    expect(body).toContain('### Fixes');
    expect(body).toContain('### Other');
    expect(body).not.toContain('### Docs');
  });

  it('should neutralize mentions, autolinks and backticks', () => {
    const body = build(commitsOf('fix(api): thanks @someone for #12 and `code`'));
    expect(body).toContain("`fix(api): thanks @someone for #12 and 'code'`");
  });

  it('should replace the commits over the length cap with a count', () => {
    const many = Array.from({ length: 50 }, (_, i) => commit(`fix(web): item number ${i}`));
    const body = build(many, NEITHER, 1000);
    expect(body.length).toBeLessThan(1000);
    expect(body).toMatch(/\+\d+ more\n$/);
  });

  it('should stay under the 60000-character cap and count every omitted commit', () => {
    const many = Array.from({ length: 2000 }, (_, i) =>
      commit(`fix(web): ${'long subject text '.repeat(10)}number ${i}`),
    );
    const body = build(many);
    const listed = body.match(/^- `abcdef0` /gm)?.length ?? 0;
    const omitted = Number(/\+(\d+) more\n$/.exec(body)?.[1]);
    expect(body.length).toBeLessThanOrEqual(60000);
    expect(listed).toBeGreaterThan(0);
    expect(listed + omitted).toBe(2000);
  });

  it('should list every commit without a count when the body is within the cap', () => {
    const body = build(commitsOf('fix(web): a', 'fix(api): b'));
    expect(body).not.toMatch(/more\n$/);
    expect(body.match(/^- `abcdef0` /gm)).toHaveLength(2);
  });

  it('should emit one heading per non-empty group in display order', () => {
    const body = build(
      commitsOf(
        'style: a',
        'build(api): b',
        'test(web): c',
        'docs: d',
        'refactor(web): e',
        'perf(api): f',
        'fix(web): g',
        'feat(web): h',
        'free text',
      ),
    );
    const headings = body.match(/^### .+$/gm);
    expect(headings).toEqual([
      '### Features',
      '### Fixes',
      '### Performance',
      '### Refactors',
      '### Docs',
      '### Tests',
      '### Chores/Tooling',
      '### Other',
    ]);
  });

  it('should keep a subject with a newline inside one line of its code span', () => {
    const body = build(commitsOf('fix(web): first line\nsecond @team line'));
    expect(body).toContain('`fix(web): first line second @team line`');
    expect(body.split('\n').filter((line) => line.includes('@team'))).toHaveLength(1);
  });
});

describe('release-pr-autofill.yml', () => {
  const jobText = WORKFLOW.slice(WORKFLOW.indexOf('\njobs:'));
  // The whole body of every `run:` key, single-line or block scalar (`run: |`): the lines that
  // follow, up to the first non-blank line indented no deeper than the key itself.
  const runBlocks = (() => {
    const lines = WORKFLOW.split('\n');
    const indentOf = (line: string): number => line.length - line.trimStart().length;
    const blocks: string[] = [];
    lines.forEach((line, index) => {
      const match = /^(\s*)run: ?(.*)$/.exec(line);
      if (!match) return;
      const body = [match[2]];
      for (let next = index + 1; next < lines.length; next += 1) {
        if (lines[next].trim() !== '' && indentOf(lines[next]) <= match[1].length) break;
        body.push(lines[next]);
      }
      blocks.push(body.join('\n'));
    });
    return blocks;
  })();

  it('should trigger on opened and reopened PRs into main only', () => {
    expect(WORKFLOW).toMatch(
      /^on:\n {2}pull_request:\n {4}types: \[opened, reopened\]\n {4}branches: \[main\]\n/m,
    );
    expect(WORKFLOW).not.toContain('pull_request_target');
    expect(WORKFLOW).not.toContain('synchronize');
  });

  it('should declare exactly contents read and pull-requests write', () => {
    expect(WORKFLOW).toMatch(/^permissions:\n {2}contents: read\n {2}pull-requests: write\n\n/m);
    expect(WORKFLOW.match(/^ *permissions:/gm)).toHaveLength(1);
  });

  it('should limit the job to same-repository develop PRs and bound it', () => {
    expect(jobText).toContain("github.event.pull_request.head.ref == 'develop'");
    expect(jobText).toContain('github.event.pull_request.head.repo.full_name == github.repository');
    expect(jobText).toMatch(/timeout-minutes: \d+/);
    expect(jobText).toContain('group: release-pr-autofill-${{ github.event.pull_request.number }}');
  });

  it('should not expand any expression inside a run block', () => {
    expect(runBlocks.length).toBeGreaterThanOrEqual(3);
    for (const block of runBlocks) {
      expect(block).not.toContain('${{');
    }
    expect(WORKFLOW).toContain('--method PATCH');
    expect(WORKFLOW).toMatch(/-F title=@/);
    expect(WORKFLOW).toMatch(/-F body=@/);
    expect(runBlocks.some((block) => block.includes('gh api --method PATCH'))).toBe(true);
  });

  it('should check out the PR head with full history and tags, with no extra fetch', () => {
    expect(WORKFLOW).toMatch(
      /uses: actions\/checkout@v\d+\n {8}with:\n {10}ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}\n {10}fetch-depth: 0\n/,
    );
    expect(runBlocks.some((block) => block.includes('git fetch'))).toBe(false);
  });

  it('should install with the Node version of .nvmrc and without lifecycle scripts', () => {
    expect(WORKFLOW).toContain("node-version-file: '.nvmrc'");
    expect(WORKFLOW).toMatch(/cache: npm/);
    expect(runBlocks.some((block) => block.startsWith('npm ci --ignore-scripts'))).toBe(true);
  });

  it('should give the PR number and token only to the apply step and cancel superseded runs', () => {
    expect(jobText).toMatch(
      /- name: Apply to the pull request\n {8}env:\n {10}PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}\n {10}GH_TOKEN: \$\{\{ github\.token \}\}\n {8}run: \|/,
    );
    expect(jobText.match(/GH_TOKEN:/g)).toHaveLength(1);
    expect(jobText).toMatch(
      /uses: actions\/checkout@v7\n {8}with:\n(?: {10}.+\n)*? {10}persist-credentials: false\n/,
    );
    expect(jobText).toContain('cancel-in-progress: true');
  });
});

describe('release-pr-autofill script (integration)', () => {
  let dir: string;
  let out: string;
  let counter = 0;

  const git = (...args: string[]): string =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'tag.gpgsign=false',
        ...args,
      ],
      { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );

  const commitFile = (message: string): void => {
    counter += 1;
    writeFileSync(join(dir, `file-${counter}.txt`), String(counter));
    git('add', '.');
    git('commit', '-m', message);
  };

  const runScript = (...args: string[]): { status: number | null; stderr: string } => {
    const result = spawnSync(process.execPath, [SCRIPT, '--repo', dir, '--out-dir', out, ...args], {
      encoding: 'utf8',
    });
    return { status: result.status, stderr: result.stderr };
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'release-pr-autofill-'));
    out = join(dir, '..', `${dir.split('/').pop()}-out`);
    git('init', '-q', '-b', 'main');
    commitFile('chore: init');
    git('tag', 'v3.1.0');
    git('tag', 'web-v2.4.0');
    git('tag', 'api-v1.2.0');
    git('checkout', '-q', '-b', 'develop');
    commitFile('fix(web): repair the chart');
    commitFile('feat(tooling): add the script');
    git('tag', 'v9.9.9');
    git('checkout', '-q', 'main');
    commitFile('chore(release): v3.1.0 [skip ci]');
    git('checkout', '-q', 'develop');
    git('merge', '-q', '--no-ff', '-m', 'Merge branch main into develop', 'main');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  });

  it('should predict each stream with the real configs and write both files', () => {
    const result = runScript('--base', 'main', '--head', 'develop');
    expect(result).toMatchObject({ status: 0, stderr: '' });

    expect(readFileSync(join(out, 'title.txt'), 'utf8')).toBe('Release v3.2.0: web, tooling');
    const body = readFileSync(join(out, 'body.md'), 'utf8');
    expect(body.startsWith(`${MARKER}\n`)).toBe(true);
    expect(body).toContain('minor release to `v3.2.0` (from `v3.1.0`)');
    expect(body).toContain('patch release to `web-v2.4.1` (from `web-v2.4.0`)');
    expect(body).toContain('- **API** (`api-v`): no release');
    expect(body).not.toContain('v9.9.9');
  });

  it('should list only the non-merge commits not on main', () => {
    const body = readFileSync(join(out, 'body.md'), 'utf8');
    expect(body).toContain('`fix(web): repair the chart`');
    expect(body).toContain('`feat(tooling): add the script`');
    expect(body).not.toContain('chore(release)');
    expect(body).not.toContain('Merge branch');
    expect(body).not.toContain('chore: init');
    expect(body.match(/^- `[0-9a-f]{7}` /gm)).toHaveLength(2);
  });

  it('should report the web only when only root text files changed', () => {
    const body = readFileSync(join(out, 'body.md'), 'utf8');
    expect(body).toContain('## Deploys\n\n- Web only.\n');
  });

  it('should not import any networking module', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    expect(source).not.toMatch(/from ['"]node:(https?|net|tls|dns|http2)['"]/);
    expect(source).not.toMatch(/\bfetch\(/);
  });

  it('should predict a major release for a BREAKING CHANGE footer', () => {
    git('checkout', '-q', 'develop');
    counter += 1;
    writeFileSync(join(dir, `file-${counter}.txt`), 'x');
    git('add', '.');
    git(
      'commit',
      '-m',
      'feat(api): drop the old route',
      '-m',
      'BREAKING CHANGE: the route is gone',
    );
    expect(runScript('--base', 'main', '--head', 'develop').status).toBe(0);
    expect(readFileSync(join(out, 'title.txt'), 'utf8')).toBe('Release v4.0.0: web, tooling, api');
    expect(readFileSync(join(out, 'body.md'), 'utf8')).toContain('major release to `v4.0.0`');
  });

  it('should deploy both apps and say so when packages/shared changed', () => {
    git('checkout', '-q', 'develop');
    counter += 1;
    mkdirSync(join(dir, 'packages/shared'), { recursive: true });
    writeFileSync(join(dir, 'packages/shared/index.ts'), `export const v = ${counter};\n`);
    git('add', '.');
    git('commit', '-m', 'fix(shared): tune the helper');
    expect(runScript('--base', 'main', '--head', 'develop').status).toBe(0);
    const body = readFileSync(join(out, 'body.md'), 'utf8');
    expect(body).toContain(
      '## Deploys\n\n- API and web.\n- The web production deploy waits for the API production deploy.\n',
    );
  });

  it('should count a file moved out of apps/api as an API change', () => {
    git('checkout', '-q', 'main');
    mkdirSync(join(dir, 'apps/api'), { recursive: true });
    writeFileSync(join(dir, 'apps/api/legacy.ts'), 'export const legacy = true;\n');
    git('add', '.');
    git('commit', '-m', 'chore(api): seed a legacy file');
    git('checkout', '-q', '-b', 'rename-only');
    mkdirSync(join(dir, 'docs'), { recursive: true });
    git('mv', 'apps/api/legacy.ts', 'docs/legacy.md');
    git('commit', '-m', 'docs(api): move the legacy file to the docs');
    expect(runScript('--base', 'main', '--head', 'rename-only').status).toBe(0);
    expect(readFileSync(join(out, 'body.md'), 'utf8')).toContain('## Deploys\n\n- API only.\n');
  });

  describe('deploy detection with the real rules', () => {
    const commitPaths = (branch: string, message: string, files: Record<string, string>): void => {
      git('checkout', '-q', 'main');
      git('checkout', '-q', '-b', branch);
      for (const [path, content] of Object.entries(files)) {
        mkdirSync(join(dir, path, '..'), { recursive: true });
        writeFileSync(join(dir, path), content);
      }
      git('add', '.');
      git('commit', '-m', message);
    };

    const deploysSection = (branch: string): string => {
      rmSync(out, { recursive: true, force: true });
      expect(runScript('--base', 'main', '--head', branch).status).toBe(0);
      const body = readFileSync(join(out, 'body.md'), 'utf8');
      return body.slice(body.indexOf('## Deploys'), body.indexOf('## Commits'));
    };

    const WAITING = '- The web production deploy waits for the API production deploy.\n';

    it.each([
      ['web-only', { 'apps/web/x.ts': 'a' }, '- Web only.\n'],
      ['api-only', { 'apps/api/x.ts': 'a' }, '- API only.\n'],
      ['shared', { 'packages/shared/x.ts': 'a' }, `- API and web.\n${WAITING}`],
      ['docs-and-spec', { 'docs/a.md': 'a', 'openspec/b.txt': 'b' }, '- Neither API nor web.\n'],
      ['scripts-only', { 'scripts/foo.mjs': 'a' }, '- Web only.\n'],
      [
        'scripts-and-api',
        { 'scripts/foo.mjs': 'a', 'apps/api/x.ts': 'a' },
        `- API and web.\n${WAITING}`,
      ],
      ['root-manifest', { 'package.json': '{}' }, `- API and web.\n${WAITING}`],
    ])('should report the real deploys for %s', (branch, files, expected) => {
      commitPaths(`deploy-${branch}`, 'chore: change files', files);
      expect(deploysSection(`deploy-${branch}`)).toBe(`## Deploys\n\n${expected}\n`);
    });

    it.each([
      ['an unexpected status', 'status', 'grep ended with unexpected status 2'],
      ['a spawn error', 'spawn-error', 'grep could not run: ENOENT'],
      [
        'an unexpected vercel-ignore.sh status',
        'vercel-ignore',
        'vercel-ignore.sh ended with unexpected status 2',
      ],
    ])('should exit non-zero and write no file on %s', (_label, scenario, message) => {
      // Runs `run()` with an injected failing spawn, in a child process, because Jest cannot
      // import the commit analyzer (ESM) in-process. The driver is a fixed string: the script
      // path, the scenario and the `run()` arguments reach it through argv, never through
      // generated code. The catch mirrors the script entry point.
      const target = join(dir, '..', `${dir.split('/').pop()}-failure`);
      rmSync(target, { recursive: true, force: true });
      const args = ['--repo', dir, '--base', 'main', '--head', 'develop', '--out-dir', target];
      const child = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', FAILING_SPAWN_DRIVER, SCRIPT, scenario, ...args],
        { encoding: 'utf8' },
      );
      expect(child.status).not.toBe(0);
      expect(child.stderr).toContain(message);
      expect(existsSync(target)).toBe(false);
    });

    it('should fail when vercel-ignore.sh ends with an unexpected status', () => {
      const spawn = (command: string): { status: number; stderr: string } =>
        command === 'grep' ? { status: 1, stderr: '' } : { status: 2, stderr: 'bad' };
      expect(() => readDeployTargets(dir, 'main', 'develop', ROOT, spawn)).toThrow(
        'vercel-ignore.sh ended with unexpected status 2: bad',
      );
    });

    it('should report no API deploy for an empty file list without calling grep', () => {
      const calls: string[] = [];
      const spawn = (command: string): { status: number } => {
        calls.push(command);
        return { status: 0 };
      };
      expect(readDeployTargets(dir, 'main', 'main', ROOT, spawn)).toEqual({
        api: false,
        web: false,
      });
      expect(calls).toEqual(['bash']);
    });
  });

  it('should exit non-zero and write nothing when the base does not exist', () => {
    rmSync(out, { recursive: true, force: true });
    const result = runScript('--base', 'does-not-exist', '--head', 'develop');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('git log failed');
    expect(existsSync(out)).toBe(false);
  });

  it('should exit non-zero and write nothing when the head does not exist', () => {
    rmSync(out, { recursive: true, force: true });
    const result = runScript('--base', 'main', '--head', 'no-such-branch');
    expect(result.status).not.toBe(0);
    expect(existsSync(out)).toBe(false);
  });

  it('should exit non-zero when --out-dir is missing or an argument is unknown', () => {
    const missing = spawnSync(process.execPath, [SCRIPT, '--repo', dir], { encoding: 'utf8' });
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain('Missing --out-dir');
    const unknown = runScript('--bogus', 'x');
    expect(unknown.status).not.toBe(0);
    expect(existsSync(out)).toBe(false);
  });
});
