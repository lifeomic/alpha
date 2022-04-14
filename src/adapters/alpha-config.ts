import { AxiosInstance } from 'axios';

export const setup = (client: AxiosInstance) => {
  client.interceptors.request.use((config) => {
    const alphaConfig = config.adapter;
    delete config.adapter;
    Object.assign(config, alphaConfig);
    return config;
  });
};
