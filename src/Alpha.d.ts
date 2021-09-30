import { AxiosInstance, AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosStatic } from 'axios';
export { AxiosResponse, AxiosError, AxiosPromise } from 'axios';
import { SpawnSyncOptions } from 'child_process';

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

export interface AlphaRequestConfig extends AxiosRequestConfig {
  requestContext?: Record<string, any>;
}

export interface AlphaResponse<T> extends AxiosResponse<T> {
  config: AlphaRequestConfig;
}

export interface AlphaInstance extends AxiosInstance{
  <T = any, R = AlphaResponse<T>>(config: AlphaRequestConfig): Promise<R>;
  <T = any, R = AlphaResponse<T>>(url: string, config?: AlphaRequestConfig): Promise<R>;
  getUri(config?: AlphaRequestConfig): string;
  request<T = any, R = AlphaResponse<T>> (config: AlphaRequestConfig): Promise<R>;
  get<T = any, R = AlphaResponse<T>>(url: string, config?: AlphaRequestConfig): Promise<R>;
  delete<T = any, R = AlphaResponse<T>>(url: string, config?: AlphaRequestConfig): Promise<R>;
  head<T = any, R = AlphaResponse<T>>(url: string, config?: AlphaRequestConfig): Promise<R>;
  options<T = any, R = AlphaResponse<T>>(url: string, config?: AlphaRequestConfig): Promise<R>;
  post<T = any, R = AlphaResponse<T>>(url: string, data?: any, config?: AlphaRequestConfig): Promise<R>;
  put<T = any, R = AlphaResponse<T>>(url: string, data?: any, config?: AlphaRequestConfig): Promise<R>;
  patch<T = any, R = AlphaResponse<T>>(url: string, data?: any, config?: AlphaRequestConfig): Promise<R>;
}

export interface DockerLambdaOptions {
  dockerImage?: string;
  handler?: string;
  taskDir?: string | boolean;
  cleanUp?: boolean;
  addEnvVars?: boolean;
  dockerArgs?: string[];
  spawnOptions?: SpawnSyncOptions;
  returnSpawnResult?: boolean;
}

interface AlphaConstructor extends AxiosStatic {
  new (target: string | Function, options?: AlphaOptions): AlphaInstance;
  new (options: AlphaOptions): AlphaInstance;

  dockerLambda(
    options: DockerLambdaOptions,
    clientOptions: AlphaOptions
  ): AlphaInstance;

  resolve(
    url: string,
    base: string,
  ): string;
}

declare const Alpha: AlphaConstructor;
export default Alpha;
