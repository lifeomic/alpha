import type { AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { Context, Handler } from 'aws-lambda';
import { SignatureV4CryptoInit, SignatureV4Init } from '@aws-sdk/signature-v4';

export interface RetryOptions {
  attempts?: number;
  factor?: number;
  maxTimeout?: number;
  retryCondition?: (err: Error) => boolean;
}

type SignatureV4Constructor = SignatureV4Init & SignatureV4CryptoInit;
type SignatureV4Optionals = 'credentials' | 'region' | 'sha256' | 'service';

export type SignAwsV4Config =
  & Omit<SignatureV4Constructor, SignatureV4Optionals>
  & Partial<Pick<SignatureV4Constructor, SignatureV4Optionals>>;

export interface AlphaResponse<ResponseData = any, ConfigData = any> extends AxiosResponse<ResponseData> {
  config: AlphaOptions<ConfigData>;
}

export interface AlphaOptions<D = any, T extends any = any> extends AxiosRequestConfig<D> {
  retry?: RetryOptions | boolean;
  lambda?: Handler;
  context?: Context;
  /**
   * (Optional) The AWS endpoint to use when invoking the target Lambda function.
   */
  lambdaEndpoint?: string;
  Lambda?: T;
  signAwsV4?: SignAwsV4Config;
  awsSdkVersion?: 2 | 3;
}

export type AlphaAdapter = (config: AlphaOptions) => AxiosPromise;
export type AlphaInterceptor = (config: AlphaOptions) => (Promise<AlphaOptions> | AlphaOptions);

export interface HandlerRequest<T = Record<string, any>> {
  event: T;
  context: Context;
}
