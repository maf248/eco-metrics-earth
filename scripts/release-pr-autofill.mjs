// Computes the title and description of a release PR (`develop` to `main`).
//
// The pure functions at the top have no I/O. The I/O layer reads git (in `--repo`) and loads the
// real `.releaserc.mjs` files and the commit analyzer (from the workspace root, where
// `node_modules` lives), so the prediction cannot drift from what `release.yml` does. Deploys are
// decided by the real rules too: `scripts/api-image-inputs.pattern` and `scripts/vercel-ignore.sh`.
// The script writes two files and never calls the network; the workflow applies them.
//
// Usage: node scripts/release-pr-autofill.mjs --out-dir <dir> [--base origin/main] [--head HEAD]
//        [--repo <dir>]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MARKER = '<!-- release-pr-autofill -->';
export const MAX_TITLE_LENGTH = 72;
export const MAX_BODY_LENGTH = 60000;

/** The word sequences `@semantic-release/commit-analyzer` reads as a breaking change footer. */
const BREAKING_PATTERN = /breaking[\s_-]*changes?/i;

/** Groups in display order; `types` lists the conventional types each one holds. */
export const COMMIT_GROUPS = [
  { heading: 'Features', types: ['feat'] },
  { heading: 'Fixes', types: ['fix'] },
  { heading: 'Performance', types: ['perf'] },
  { heading: 'Refactors', types: ['refactor'] },
  { heading: 'Docs', types: ['docs'] },
  { heading: 'Tests', types: ['test'] },
  { heading: 'Chores/Tooling', types: ['chore', 'build', 'ci', 'style'] },
  { heading: 'Other', types: [] },
];

/**
 * The streams released by `release.yml`, each with its releaserc file (relative to the workspace
 * root).
 */
export const STREAMS = [
  { id: 'root', label: 'Root', file: '.releaserc.mjs' },
  { id: 'web', label: 'Web', file: 'apps/web/.releaserc.mjs' },
  { id: 'api', label: 'API', file: 'apps/api/.releaserc.mjs' },
];

const CONVENTIONAL_SUBJECT = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.*)$/;

/**
 * Splits a commit subject into its conventional parts. A non-conventional subject has a `null`
 * type and no scopes.
 */
export function parseCommit(subject) {
  const match = CONVENTIONAL_SUBJECT.exec(subject.trim());
  if (!match) {
    return { type: null, scopes: [], description: subject.trim(), breaking: false };
  }
  const [, type, scope = '', bang, description] = match;
  const scopes = scope
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  return { type: type.toLowerCase(), scopes, description, breaking: bang === '!' };
}

/** Groups commits (`{ hash, subject }`) by type, in display order, omitting empty groups. */
export function groupCommits(commits) {
  const groups = COMMIT_GROUPS.map((group) => ({ heading: group.heading, commits: [] }));
  for (const commit of commits) {
    const { type } = parseCommit(commit.subject);
    const index = COMMIT_GROUPS.findIndex((group) => type !== null && group.types.includes(type));
    groups[index === -1 ? COMMIT_GROUPS.length - 1 : index].commits.push(commit);
  }
  return groups.filter((group) => group.commits.length > 0);
}

/**
 * Commit scopes, deduplicated, ordered by frequency and then by first appearance in the given
 * order (the entry point passes the commits oldest first).
 */
export function collectTopics(commits) {
  const counts = new Map();
  for (const commit of commits) {
    for (const scope of parseCommit(commit.subject).scopes) {
      counts.set(scope, (counts.get(scope) ?? 0) + 1);
    }
  }
  return [...counts.keys()]
    .map((topic, order) => ({ topic, order }))
    .sort((a, b) => counts.get(b.topic) - counts.get(a.topic) || a.order - b.order)
    .map(({ topic }) => topic);
}

/** Next version after applying a release type to `major.minor.patch`. */
export function bump(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Final guard of the title: one line, no breaking keywords, at most 72 characters. */
function guardTitle(title) {
  let guarded = title.replace(/\s+/g, ' ');
  while (BREAKING_PATTERN.test(guarded)) {
    guarded = guarded.replace(BREAKING_PATTERN, '');
  }
  guarded = guarded.replace(/\s+/g, ' ').trim();
  return guarded.length > MAX_TITLE_LENGTH ? `${guarded.slice(0, MAX_TITLE_LENGTH - 1)}…` : guarded;
}

/** `Release v<version>: <topics>`, bounded to 72 characters and safe for `main`'s history. */
export function buildTitle(rootVersion, topics) {
  const prefix = rootVersion ? `Release v${rootVersion}` : 'Release';
  const safeTopics = topics
    .map((topic) => topic.replace(/\s+/g, ' ').trim())
    .filter((topic) => topic.length > 0 && !BREAKING_PATTERN.test(topic));
  if (safeTopics.length === 0) return guardTitle(prefix);

  for (let shown = safeTopics.length; shown >= 1; shown -= 1) {
    const dropped = safeTopics.length - shown;
    const suffix = dropped > 0 ? `, +${dropped} more` : '';
    const title = `${prefix}: ${safeTopics.slice(0, shown).join(', ')}${suffix}`;
    if (title.length <= MAX_TITLE_LENGTH) return guardTitle(title);
  }

  const dropped = safeTopics.length - 1;
  const suffix = dropped > 0 ? `, +${dropped} more` : '';
  const room = MAX_TITLE_LENGTH - `${prefix}: `.length - suffix.length - 1;
  return guardTitle(`${prefix}: ${safeTopics[0].slice(0, Math.max(room, 0))}…${suffix}`);
}

/** A subject as an inline code span: no mention, no autolink, no inner backtick. */
export function sanitizeSubject(subject) {
  return `\`${subject.replace(/\s+/g, ' ').replace(/`/g, "'").trim()}\``;
}

function releaseLine(release) {
  if (!release.type) return `- **${release.label}** (\`${release.prefix}\`): no release`;
  const from = release.last ? `from \`${release.prefix}${release.last}\`` : 'first release';
  return `- **${release.label}** (\`${release.prefix}\`): ${release.type} release to \`${release.prefix}${release.next}\` (${from})`;
}

function deployLines({ api, web }) {
  if (api && web) {
    return ['- API and web.', '- The web production deploy waits for the API production deploy.'];
  }
  if (api) return ['- API only.'];
  if (web) return ['- Web only.'];
  return ['- Neither API nor web.'];
}

/**
 * The PR description. `releases` is `[{ label, prefix, type, last, next }]` (type `null` = no
 * release), `deploys` the result of `readDeployTargets` and `commits` `[{ hash, subject }]`.
 */
export function buildBody({ releases, deploys, commits, head, maxLength = MAX_BODY_LENGTH }) {
  const lines = [
    MARKER,
    `Expected result if this PR is merged as it is, computed from \`${head}\`. Reopen the PR to refresh it.`,
    '',
    '## Releases',
    '',
    ...releases.map(releaseLine),
    '',
    '## Deploys',
    '',
    ...deployLines(deploys),
    '',
    '## Commits',
  ];
  if (commits.length === 0) lines.push('', 'No commits.');

  let used = lines.join('\n').length;
  let remaining = commits.length;
  let full = false;
  const reserve = 64;
  for (const group of groupCommits(commits)) {
    if (full) break;
    const section = [];
    for (const commit of group.commits) {
      const entry = `- \`${commit.hash.slice(0, 7)}\` ${sanitizeSubject(commit.subject)}`;
      if (used + entry.length + group.heading.length + reserve > maxLength) {
        full = true;
        break;
      }
      section.push(entry);
      used += entry.length + 1;
      remaining -= 1;
    }
    if (section.length > 0) {
      lines.push('', `### ${group.heading}`, '', ...section);
      used += group.heading.length + 8;
    }
  }
  if (remaining > 0) lines.push('', `+${remaining} more`);
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------
// I/O layer
// ---------------------------------------------------------------------------------------------

function git(repo, args) {
  const result = spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${result.stderr.trim() || result.error?.message}`);
  }
  return result.stdout;
}

/** Non-merge commits of `base..head`, newest first, with their full message. */
export function readCommits(repo, base, head) {
  const output = git(repo, ['log', '--no-merges', '--format=%H%x1f%B%x1e', `${base}..${head}`]);
  return output
    .split('\x1e')
    .map((record) => record.replace(/^\n+/, ''))
    .filter((record) => record.trim().length > 0)
    .map((record) => {
      const [hash, message] = record.split('\x1f');
      return { hash, message: message.trim(), subject: message.trim().split('\n')[0] };
    });
}

/**
 * Files changed between the merge base of `base` and `head`, and `head`. `--no-renames` lists both
 * sides of a move, so a file moved out of an app still counts as a change to that app.
 */
export function readChangedFiles(repo, base, head) {
  return git(repo, ['diff', '--name-only', '--no-renames', '-z', `${base}...${head}`])
    .split('\0')
    .filter((file) => file.length > 0);
}

/**
 * Which apps deploy, decided with the real rules and none of its own. The API deploys when any
 * changed file matches `scripts/api-image-inputs.pattern`, evaluated as `deploy-api.yml` does
 * (`grep -E` with the file content as the pattern). The web deploys when `scripts/vercel-ignore.sh`
 * exits 1 for the merge base and the head. Both files come from `workspaceRoot`; git runs in `repo`.
 * Any unexpected status or spawn error throws. `spawn` is injectable for tests.
 */
export function readDeployTargets(repo, base, head, workspaceRoot, spawn = spawnSync) {
  const files = readChangedFiles(repo, base, head);

  // `$(cat file)` strips trailing newlines; do the same.
  const pattern = readFileSync(
    join(workspaceRoot, 'scripts/api-image-inputs.pattern'),
    'utf8',
  ).replace(/\n+$/, '');
  let api = false;
  // With no changed file there is nothing to match, so grep is not called.
  if (files.length > 0) {
    const grep = spawn('grep', ['-E', pattern], {
      input: `${files.join('\n')}\n`,
      encoding: 'utf8',
      // grep echoes every match; same headroom as `git()` so a large diff never hits ENOBUFS.
      maxBuffer: 64 * 1024 * 1024,
    });
    api = statusToBoolean(grep, 'grep');
  }

  const mergeBase = git(repo, ['merge-base', base, head]).trim();
  const sha = git(repo, ['rev-parse', head]).trim();
  const ignore = spawn('bash', [join(workspaceRoot, 'scripts/vercel-ignore.sh')], {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      VERCEL_GIT_PREVIOUS_SHA: mergeBase,
      VERCEL_GIT_COMMIT_SHA: sha,
      VERCEL_GIT_COMMIT_MESSAGE: 'Merge pull request',
    },
  });
  // vercel-ignore.sh: exit 1 builds, exit 0 skips.
  const web = statusToBoolean(ignore, 'vercel-ignore.sh', { yes: 1, no: 0 });

  return { api, web };
}

/** Maps a spawn result to a boolean (`yes` status is true, `no` status false); else throws. */
function statusToBoolean(result, name, { yes = 0, no = 1 } = {}) {
  if (result.error) throw new Error(`${name} could not run: ${result.error.message}`);
  if (result.status === yes) return true;
  if (result.status === no) return false;
  const detail = result.stderr ? `: ${String(result.stderr).trim()}` : '';
  throw new Error(`${name} ended with unexpected status ${result.status}${detail}`);
}

/** The highest `x.y.z` among the tags `<prefix>x.y.z` reachable from `base`, or `null`. */
export function readLastVersion(repo, base, prefix) {
  const versions = git(repo, ['tag', '--merged', base, '--list', `${prefix}*`])
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length))
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version));
  if (versions.length === 0) return null;
  return versions.sort((a, b) => {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    return right[0] - left[0] || right[1] - left[1] || right[2] - left[2];
  })[0];
}

const SILENT_LOGGER = { log() {}, warn() {}, error() {}, success() {}, info() {}, debug() {} };

/** Predicts every stream with the real releaserc files and the real commit analyzer. */
export async function predictReleases(repo, base, commits, workspaceRoot) {
  const { analyzeCommits } = await import('@semantic-release/commit-analyzer');
  const releases = [];
  for (const stream of STREAMS) {
    const config = (await import(pathToFileURL(join(workspaceRoot, stream.file)).href)).default;
    const entry = config.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === '@semantic-release/commit-analyzer',
    );
    if (!entry) throw new Error(`${stream.file} has no commit-analyzer plugin`);
    const prefix = config.tagFormat.split('${version}')[0];
    const last = readLastVersion(repo, base, prefix);
    const type = await analyzeCommits(entry[1], {
      commits: commits.map(({ hash, message }) => ({ hash, message })),
      cwd: workspaceRoot,
      logger: SILENT_LOGGER,
    });
    releases.push({
      label: stream.label,
      prefix,
      type: type ?? null,
      last,
      next: type ? bump(last ?? '0.0.0', type) : null,
    });
  }
  return releases;
}

function parseArguments(argv) {
  const options = { base: 'origin/main', head: 'HEAD', repo: process.cwd(), outDir: undefined };
  const names = { '--base': 'base', '--head': 'head', '--repo': 'repo', '--out-dir': 'outDir' };
  for (let i = 0; i < argv.length; i += 2) {
    const name = names[argv[i]];
    if (!name || argv[i + 1] === undefined) throw new Error(`Unexpected argument: ${argv[i]}`);
    options[name] = argv[i + 1];
  }
  if (!options.outDir) throw new Error('Missing --out-dir');
  return options;
}

/** Computes the result and writes `title.txt` and `body.md` to `--out-dir`. */
export async function run(argv, spawn = spawnSync) {
  const { base, head, repo, outDir } = parseArguments(argv);
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const commits = readCommits(repo, base, head);
  const releases = await predictReleases(repo, base, commits, workspaceRoot);
  const deploys = readDeployTargets(repo, base, head, workspaceRoot, spawn);
  const shortHead = git(repo, ['rev-parse', '--short=7', head]).trim();

  const title = buildTitle(releases[0].next, collectTopics([...commits].reverse()));
  const body = buildBody({ releases, deploys, commits, head: shortHead });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'title.txt'), title);
  writeFileSync(join(outDir, 'body.md'), body);
}

const isEntryPoint =
  process.argv[1] !== undefined &&
  pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url;

if (isEntryPoint) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
