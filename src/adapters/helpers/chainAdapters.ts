import axios, { AxiosAdapter } from 'axios';
import type { AlphaOptions, AlphaAdapter } from '../../types';

export type Predicate = (config: AlphaOptions) => any;

export const chainAdapters = (
  config: AlphaOptions,
  predicate: Predicate,
  adapter: AlphaAdapter,
) => {
  const nextAdapter = config.adapter || axios.defaults.adapter as AxiosAdapter;

  config.adapter = async (config) => {
    if (predicate(config)) {
      return adapter(config);
    }
    return nextAdapter(config);
  };

  return config;
};
