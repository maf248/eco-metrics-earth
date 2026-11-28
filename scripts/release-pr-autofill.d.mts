/** Types of the release PR autofill script, for the Jest suite that imports it from TypeScript. */

export type ReleaseType = 'major' | 'minor' | 'patch';

/** A commit as listed in the description. */
export interface ListedCommit {
  hash: string;
  subject: string;
}

export interface ParsedCommit {
  type: string | null;
  scopes: string[];
  description: string;
  breaking: boolean;
}

export interface CommitGroup {
  heading: string;
  commits: ListedCommit[];
}

export interface DeployTargets {
  api: boolean;
  web: boolean;
}

export interface StreamRelease {
  label: string;
  prefix: string;
  type: ReleaseType | null;
  last: string | null;
  next: string | null;
}

export interface BuildBodyInput {
  releases: StreamRelease[];
  deploys: DeployTargets;
  commits: ListedCommit[];
  head: string;
  maxLength?: number;
}

export const MARKER: string;
export const MAX_TITLE_LENGTH: number;
export const MAX_BODY_LENGTH: number;

export function parseCommit(subject: string): ParsedCommit;
export function groupCommits(commits: ListedCommit[]): CommitGroup[];
export function collectTopics(commits: ListedCommit[]): string[];
export function bump(version: string, type: ReleaseType): string;
export function buildTitle(rootVersion: string | null | undefined, topics: string[]): string;
export function sanitizeSubject(subject: string): string;
export function buildBody(input: BuildBodyInput): string;
export type SpawnResult = {
  status: number | null;
  stderr?: string | null;
  error?: Error;
};
export type SpawnFunction = (
  command: string,
  args: string[],
  options: Record<string, unknown>,
) => SpawnResult;
export function readDeployTargets(
  repo: string,
  base: string,
  head: string,
  workspaceRoot: string,
  spawn?: SpawnFunction,
): DeployTargets;
export function run(argv: string[], spawn?: SpawnFunction): Promise<void>;
