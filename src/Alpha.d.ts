declare module '@lifeomic/alpha' {
  import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

  interface AlphaConstructor {
    new (config: AxiosRequestConfig): AxiosInstance;
  }

  const Alpha: AlphaConstructor;
  export = Alpha;
}
