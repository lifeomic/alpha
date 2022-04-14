// Use a static list of adapters here instead of
// reading them from the filesystem so that webpack
// can easily find the modules needed to include.
import { setup as handler } from './lambda-handler';
import { setup as invocation } from './lambda-invocation';
import { setup as retry } from './response-retry';
import { setup as alphaConfig } from './alpha-config';

module.exports = [
  handler,
  invocation,
  retry,
  alphaConfig
];
