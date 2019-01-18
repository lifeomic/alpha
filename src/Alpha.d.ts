declare module '@lifeomic/alpha' {
  import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosInterceptorManager,
    AxiosResponse,
    AxiosPromise
  } from 'axios';

  class Alpha {
    constructor(config: AxiosRequestConfig);
    request<T = any>(config: AxiosRequestConfig): AxiosPromise<T>;
    get<T = any>(url: string, config?: AxiosRequestConfig): AxiosPromise<T>;
    delete(url: string, config?: AxiosRequestConfig): AxiosPromise;
    head(url: string, config?: AxiosRequestConfig): AxiosPromise;
    post<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): AxiosPromise<T>;
    put<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): AxiosPromise<T>;
    patch<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): AxiosPromise<T>;
  }
  export = Alpha;
}
