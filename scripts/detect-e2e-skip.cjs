#!/usr/bin/env node
/**
 * Decides whether CI can skip the E2E step (skip_e2e=true|false). E2E is skipped
 * only when BOTH hold: every path changed between BASE_SHA and HEAD_SHA is docs-only
 * (scripts/docs-only-paths.pattern) AND every latest check run named CI_CHECK_NAME
 * on BASE_SHA concluded `success`. Any doubt runs E2E, and the script always exits 0.
 */
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

const PATTERN_PATH = 'scripts/docs-only-paths.pattern';
// GitHub Actions app: ignores a same-named check created by any other app.
const GITHUB_ACTIONS_APP_ID = 15368;
// Control files never count as docs, whatever the pattern says: changing them
// changes how (or whether) E2E is skipped.
const CONTROL_FILES = [PATTERN_PATH, 'scripts/detect-e2e-skip.cjs', '.github/workflows/ci.yml'];
const DEFAULT_API_URL = 'https://api.github.com';
const API_TIMEOUT_MS = 10000;

const isZeroSha = (sha) => /^0+$/.test(sha);

/** First non-empty line of a failed git call's stderr, so the reason names the real cause. */
const gitErrorLine = (result) =>
  (result.stderr || '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || `exit code ${result.status}`;

/**
 * Pure decision over facts collected by `run`.
 * @param {object} inputs
 * @param {string} [inputs.doubt] a reason that makes skipping unprovable
 * @param {string[]} [inputs.changedFiles]
 * @param {RegExp[]} [inputs.patterns]
 * @param {{ conclusions?: (string|null)[], error?: string }} [inputs.baseCheck]
 * @returns {{ skip: boolean, reason: string, matched: string[], nonDocs: string[], needsBaseCheck: boolean }}
 */
function decide(inputs) {
  const { doubt, changedFiles = [], patterns = [], baseCheck } = inputs;
  const matched = changedFiles.filter(
    (file) => !CONTROL_FILES.includes(file) && patterns.some((pattern) => pattern.test(file)),
  );
  const nonDocs = changedFiles.filter((file) => !matched.includes(file));
  const run = (reason, needsBaseCheck = false) => ({
    skip: false,
    reason,
    matched,
    nonDocs,
    needsBaseCheck,
  });

  if (doubt) {
    return run(doubt);
  }
  if (changedFiles.length === 0) {
    return run('the diff is empty');
  }
  if (nonDocs.length > 0) {
    return run('the diff contains files that are not documentation');
  }
  if (!baseCheck) {
    return run('the base check has not been verified', true);
  }
  if (baseCheck.error) {
    return run(`could not read the base check: ${baseCheck.error}`);
  }
  const conclusions = baseCheck.conclusions ?? [];
  if (conclusions.length === 0) {
    return run('the base revision has no matching check run');
  }
  const notGreen = conclusions.filter((conclusion) => conclusion !== 'success');
  if (notGreen.length > 0) {
    return run(`the base check is not green (${describeConclusions(conclusions)})`);
  }
  return {
    skip: true,
    reason: 'docs-only diff and the base check concluded success',
    matched,
    nonDocs,
    needsBaseCheck: false,
  };
}

function describeConclusions(conclusions) {
  return conclusions.map((conclusion) => conclusion ?? 'in progress').join(', ');
}

function parsePatterns(content) {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error('pattern file has no pattern');
  }
  return lines.map((line) => new RegExp(line));
}

async function fetchBaseCheck({ env, fetch, baseSha }) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repository, CI_CHECK_NAME: name } = env;
  if (!token || !repository || !name) {
    return { error: 'GITHUB_TOKEN, GITHUB_REPOSITORY or CI_CHECK_NAME is missing' };
  }
  const apiUrl = env.GITHUB_API_URL || DEFAULT_API_URL;
  const url =
    `${apiUrl}/repos/${repository}/commits/${baseSha}/check-runs` +
    `?check_name=${encodeURIComponent(name)}&filter=latest&app_id=${GITHUB_ACTIONS_APP_ID}&per_page=100`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { error: `GitHub API answered ${response.status}` };
    }
    const body = await response.json();
    const runs = body && body.check_runs;
    if (!Array.isArray(runs)) {
      return { error: 'GitHub API answered an unexpected body' };
    }
    if (typeof body.total_count === 'number' && body.total_count > runs.length) {
      return { error: 'GitHub API answered a truncated list of check runs' };
    }
    return {
      conclusions: runs.map((checkRun) =>
        checkRun && typeof checkRun.conclusion === 'string' ? checkRun.conclusion : null,
      ),
    };
  } catch (error) {
    return {
      error: `GitHub API request failed (${error instanceof Error ? error.message : error})`,
    };
  }
}

/**
 * Reads the diff and the base pattern from git, or a doubt when git cannot prove them.
 * The repository is checked first so a repository git refuses to read (e.g. "dubious
 * ownership" when the job runs as another user than the workspace owner) is reported
 * as such, not mistaken for a base SHA that is missing from the history.
 */
function collectGitFacts({ git, baseSha, headSha }) {
  if (!baseSha || isZeroSha(baseSha)) {
    return { doubt: 'no base revision to compare against' };
  }
  const repository = git(['rev-parse', '--git-dir']);
  if (repository.status !== 0) {
    return { doubt: `git cannot read the repository (${gitErrorLine(repository)})` };
  }
  if (git(['cat-file', '-e', `${baseSha}^{commit}`]).status !== 0) {
    return { doubt: 'base SHA is not in the repository history' };
  }
  // core.quotePath=false: otherwise non-ASCII paths are quoted and never match.
  // --no-renames: a rename lists both its old and new path.
  const diff = git([
    '-c',
    'core.quotePath=false',
    'diff',
    '--no-renames',
    '--name-only',
    baseSha,
    headSha,
  ]);
  if (diff.status !== 0) {
    return { doubt: 'git diff failed' };
  }
  const changedFiles = diff.stdout.split('\n').filter(Boolean);
  // The pattern comes from the base revision, so a push cannot widen its own skip.
  const shown = git(['show', `${baseSha}:${PATTERN_PATH}`]);
  try {
    if (shown.status !== 0) {
      throw new Error('missing');
    }
    return { changedFiles, patterns: parsePatterns(shown.stdout) };
  } catch {
    return {
      changedFiles,
      doubt: 'the docs-only pattern is missing or invalid at the base revision',
    };
  }
}

/** Collects the facts in order, stopping at the first doubt, then reports. */
async function run(deps) {
  const { env, git, fetch, stdout, appendFile } = deps;
  const baseSha = (env.BASE_SHA || '').trim();
  const headSha = (env.HEAD_SHA || '').trim();
  const facts = collectGitFacts({ git, baseSha, headSha });
  let baseCheck;

  let decision = decide(facts);
  if (decision.needsBaseCheck) {
    baseCheck = await fetchBaseCheck({ env, fetch, baseSha });
    decision = decide({ ...facts, baseCheck });
  }

  report({ deps: { env, stdout, appendFile }, baseSha, headSha, baseCheck, decision });
  return decision;
}

function report({ deps, baseSha, headSha, baseCheck, decision }) {
  const { env, stdout, appendFile } = deps;
  const list = (files) => (files.length > 0 ? files.join(' ') : 'none');
  const conclusion = baseCheck
    ? baseCheck.error
      ? `unavailable (${baseCheck.error})`
      : list((baseCheck.conclusions ?? []).map((value) => value ?? 'in progress'))
    : 'not checked';
  const verdict = `skip_e2e=${decision.skip}`;

  stdout(`Base SHA: ${baseSha || 'none'}`);
  stdout(`Head SHA: ${headSha}`);
  stdout(`Docs files: ${list(decision.matched)}`);
  stdout(`Non-docs files: ${list(decision.nonDocs)}`);
  stdout(`Base check conclusion: ${conclusion}`);
  stdout(`Decision: ${verdict} (${decision.reason})`);

  try {
    if (env.GITHUB_OUTPUT) {
      appendFile(env.GITHUB_OUTPUT, `${verdict}\n`);
    }
    if (env.GITHUB_STEP_SUMMARY) {
      appendFile(
        env.GITHUB_STEP_SUMMARY,
        [
          '### E2E skip detection',
          `- Base SHA: \`${baseSha || 'none'}\``,
          `- Head SHA: \`${headSha}\``,
          `- Docs files: ${list(decision.matched)}`,
          `- Non-docs files: ${list(decision.nonDocs)}`,
          `- Base check conclusion: ${conclusion}`,
          `- Decision: **${verdict}** (${decision.reason})`,
          '',
        ].join('\n'),
      );
    }
  } catch {
    // Reporting must never change the outcome; an unset output means "run E2E".
  }
}

const realDeps = () => ({
  env: process.env,
  git: (args) => {
    const result = spawnSync('git', args, { encoding: 'utf8' });
    return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  },
  fetch: (url, init) => fetch(url, init),
  stdout: (line) => console.log(line),
  appendFile: (file, text) => fs.appendFileSync(file, text),
});

module.exports = { decide, run };

if (require.main === module) {
  run(realDeps()).catch((error) => {
    // Unexpected failure: leave skip_e2e unset, which runs E2E.
    console.log(`E2E skip detection failed, E2E will run: ${error}`);
  });
}
