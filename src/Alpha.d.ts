import { AxiosInstance, AxiosStatic } from 'axios';
export { AxiosResponse, AxiosError, AxiosPromise } from 'axios';
import { SpawnSyncOptions } from 'child_process';
import { AlphaOptions } from './types';
export { AlphaOptions, RetryOptions } from './types';

export type AlphaInstance = AxiosInstance;

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
