// R15K Arcade – commitlint for PR titles (pr-title.yml) and local commits: Conventional Commits with the
// repository's scopes (CONTRIBUTING.md, "Commits and pull requests"). Scope is optional; release PRs use
// "chore: release x.y.z" (no scope), Renovate "chore(deps): …".
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'engine',
        'ui',
        'bug-hunt',
        'arcade',
        'plugins',
        'tauri',
        'android',
        'ios',
        'macos',
        'windows',
        'ci',
        'deps',
        'tools',
        'docs',
      ],
    ],
    'header-max-length': [2, 'always', 100],
  },
};
