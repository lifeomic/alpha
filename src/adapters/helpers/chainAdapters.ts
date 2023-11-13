import axios, { getAdapter } from 'axios';
import type { AlphaOptions, AlphaAdapter } from '../../types';

export type Predicate = (config: AlphaOptions) => any;

export const chainAdapters = (
  config: AlphaOptions,
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
