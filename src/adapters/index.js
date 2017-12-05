// Use a static list of adapters here instead of
// reading them from the filesystem so that webpack
// can easily find the modules needed to include.

module.exports = [
  require('./lambda-handler.js'),
  require('./lambda-invocation.js'),
  require('./response-retry.js')
];
