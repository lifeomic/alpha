declare module '@lifeomic/alpha' {
  import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

  export interface RetryOptions {
    attempts?: number,
    factor?: number,
    maxTimeout?: 10000,
    retryCondition?: (err: Error) => boolean
  }

  export interface AlphaOptions extends AxiosRequestConfig {
    retry?: RetryOptions,
    lambda?: Function
  }

  export type AlphaClient = AxiosInstance;

  interface AlphaConstructor {
    new (target: string | Function | AlphaOptions, options?: AlphaOptions): AlphaClient;
  }

  const Alpha: AlphaConstructor;
  export default Alpha;
}
