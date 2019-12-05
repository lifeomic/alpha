import {AxiosInstance} from 'axios';
import defaults from 'lodash/defaults';
import isBoolean from 'lodash/isBoolean';

import RequestError from '../../utils/RequestError';
import {AlphaConfig, RetryConfig} from '../../types';

const DEFAULTS = {
  attempts: 3,
  factor: 2,
  maxTimeout: 10000,
  retryCondition: isRetryableError
};

function isRetryableError (error: RequestError) {
  if (error.isLambdaInvokeTimeout) return true;

  return error.code !== 'ECONNABORTED' &&
    (!error.response || (error.response.status >= 500 && error.response.status <= 599));
}

function setDefaults (config: AlphaConfig) {
  config.__retryCount = config.__retryCount || 0;
  if (isBoolean(config.retry)) {
    config.retry = {};
  }
  config.retry = defaults(config.retry, DEFAULTS);
}

async function exponentialBackoff (config: AlphaConfig) {
  config.__retryCount! += 1;
  const retryConfig = config.retry as RetryConfig;

  // Get random between 1 and 1000
  const random = Math.random() * 1000;
  // Jitter the backoff within the range of [70%...100%]
  const jitter = 1 - Math.random() % 0.3;
  const backoff = Math.pow(retryConfig.factor!, config.__retryCount!) * random * jitter;
  const delay = Math.min(backoff, retryConfig.maxTimeout!);

  return new Promise((resolve) => {
    setTimeout(() => { resolve(); }, delay);
  });
}

/**
 * Attempts to retry a failed request a configurable number of times.
 */
export default (client: AxiosInstance) => {
  client.interceptors.response.use(
    undefined,
    async err => {
      const config = err.config;
      if (!config || !config.retry) {
        throw err;
      }

      setDefaults(config);

      if (!config.retry.retryCondition(err) ||
          config.__retryCount >= config.retry.attempts) {
        throw err;
      }

      await exponentialBackoff(config);

      // Send another request after delay
      return client.request(config);
    }
  );
};
