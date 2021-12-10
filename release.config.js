module.exports = {
  branches: ['master'],
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    '@semantic-release/npm',
    [
      '@semantic-release/github',
      {
        // You may want to turn this off to avoid creating Issues
        // on failed builds.
        failComment: false
      }
    ]
  ]
};
