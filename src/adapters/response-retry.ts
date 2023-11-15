import isBoolean from 'lodash/isBoolean';
import defaults from 'lodash/defaults';
import _get from 'lodash/get';
import _inRange from 'lodash/inRange';
import { RequestError } from './helpers/requestError';
import type { AlphaOptions } from '../types';
import type { Alpha } from '../alpha';

export interface RetryOptions {
  attempts: number;
  factor: number;
  maxTimeout: number;
  retryCondition: (err: Error) => boolean;
}

export interface RetryAlphaOptions extends Omit<AlphaOptions, 'retry'> {
  __retryCount: number;
  retry: RetryOptions;
}

const isServerSideError = (error: RequestError) => {
  return (
    error.response
    && (
      _inRange(_get(error.response, 'StatusCode', 0) as number, 500, 600)
      || _inRange(_get(error.response, 'status', 0) as number, 500, 600)
    )
  );
};

const isRetryableError = (error: RequestError) => {
  if (error.isLambdaInvokeTimeout) return true;

  return error.code !== 'ECONNABORTED' && isServerSideError(error);
};

const DEFAULTS = {
  attempts: 3,
  factor: 2,
  maxTimeout: 10000,
  retryCondition: isRetryableError,
};

const setDefaults = (config: AlphaOptions) => {
  if (isBoolean(config.retry)) {
    config.retry = {};
  }
  config.retry = defaults(config.retry, DEFAULTS);
};

const exponentialBackoff = (config: RetryAlphaOptions) => {
  config.__retryCount += 1;

  // Get random between 1 and 1000
  const random = Math.random() * 1000;
  // Jitter the backoff within the range of [70%...100%]
  const jitter = 1 - Math.random() % 0.3;
  const backoff = Math.pow(config.retry.factor, config.__retryCount) * random * jitter;
  const delay = Math.min(backoff, config.retry.maxTimeout);

  return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Attempts to retry a failed request a configurable number of times.
 */
export const setup = (client: Alpha) => {
  client.interceptors.response.use(
    undefined,
    async (err: any) => {
      if (!('config' in err && err.config.retry)) {
        return Promise.reject(err);
      }

      const config = err.config as RetryAlphaOptions;

      setDefaults(config);
      config.__retryCount = config.__retryCount || 0;

      if (!config.retry.retryCondition(err as Error) ||
          config.__retryCount >= config.retry.attempts) {
        return Promise.reject(err);
      }

      await exponentialBackoff(config);

      // Send another request after delay
      return client.request(config);
    },
  );
};
