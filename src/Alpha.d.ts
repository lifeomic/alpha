declare module '@lifeomic/alpha' {
  import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

  export interface RetryOptions {
    attempts: number,
    factor: number,
    maxTimeout: 10000,
    retryCondition: Function
  }

  export interface AlphaOptions extends AxiosRequestConfig {
    return: RetryOptions,
    lambda: Function
  }

  export type AlphaClient = AxiosInstance;

  interface AlphaConstructor {
    new (target: string | Function | AlphaOptions, options: AlphaOptions): AlphaClient;
  }

  const Alpha: AlphaConstructor;
  export = Alpha;
}
