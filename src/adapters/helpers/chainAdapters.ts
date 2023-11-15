import axios, { getAdapter } from 'axios';
import type { InternalAlphaRequestConfig, AlphaAdapter } from '../../types';

export type Predicate = (config: InternalAlphaRequestConfig) => any;

export const chainAdapters = (
  config: InternalAlphaRequestConfig,
  predicate: Predicate,
  adapter: AlphaAdapter,
) => {
  const nextAdapter = getAdapter(config.adapter || axios.defaults.adapter);

  config.adapter = async (config) => {
    if (predicate(config)) {
      return adapter(config);
    }
    return nextAdapter(config);
  };

  return config;
};
