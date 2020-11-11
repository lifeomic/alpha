declare module '@lifeomic/alpha' {
  import { AxiosInstance, AxiosRequestConfig } from 'axios';

  interface RetryOptions {
    attempts?: number,
    factor?: number,
    maxTimeout?: number,
    retryCondition?: (err: Error) => boolean
  }

  export interface AlphaOptions extends AxiosRequestConfig {
    retry?: RetryOptions,
    lambda?: Function
  }

  export type AlphaInstance = AxiosInstance;

  interface AlphaConstructor {
    new (target: string | Function, options?: AlphaOptions): AlphaInstance;
    new (options: AlphaOptions): AlphaInstance;
  }

  // default export
  export = AlphaConstructor;
}
