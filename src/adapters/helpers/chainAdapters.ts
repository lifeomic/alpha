import axios, { getAdapter } from 'axios';
import type { AlphaOptionsForLambda, AlphaAdapter } from '../../types';

export type Predicate = (config: AlphaOptionsForLambda) => any;

export const chainAdapters = (
  config: AlphaOptionsForLambda,
  predicate: Predicate,
  adapter: AlphaAdapter<AlphaOptionsForLambda>,
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
