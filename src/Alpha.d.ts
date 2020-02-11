declare module '@lifeomic/alpha' {
  import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

  interface RetryOptions {
    attempts?: number,
    factor?: number,
    maxTimeout?: number,
    retryCondition?: (err: Error) => boolean
  }

  interface AlphaOptions extends AxiosRequestConfig {
    retry?: RetryOptions,
    lambda?: Function
  }

  type AlphaClient = AxiosInstance;

  interface AlphaConstructor {
    new (target: string | Function, options?: AlphaOptions): AlphaClient;
    new (options: AlphaOptions): AlphaClient;
  }

  const Alpha: AlphaConstructor;
  export = Alpha;
}
