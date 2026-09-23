import preset from 'conventional-changelog-conventionalcommits';

const { transform: defaultTransform, ...restWriterOpts } = preset().writer;

const ALLOWED_SCOPES = ['web', 'shared'];

export default {
  branches: ['main'],
  tagFormat: 'web-v${version}',
  plugins: [
    ['@semantic-release/npm', { npmPublish: false }],
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { scope: 'api', release: false },
          { scope: 'tooling', release: false },
          { scope: 'docs', release: false },
          { scope: 'postman', release: false },
          { scope: 'release', release: false },
          { breaking: true, release: 'major' },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        writerOpts: {
          ...restWriterOpts,
          transform: (commit, context) => {
            // Include commits without a scope (affects everything) or
            // commits scoped to web or shared
            if (commit.scope && !ALLOWED_SCOPES.includes(commit.scope)) {
              return null;
            }
            return defaultTransform(commit, context);
          },
        },
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
      },
    ],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): web-v${nextRelease.version} [skip ci]',
      },
    ],
  ],
};
