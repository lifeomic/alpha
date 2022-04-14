import type { Alpha } from '../alpha';

export const setup = (client: Alpha) => {
  client.interceptors.request.use((config) => {
    const alphaConfig = config.adapter;
    delete config.adapter;
    Object.assign(config, alphaConfig);
    return config;
  });
};
