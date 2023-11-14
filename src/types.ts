import type { AxiosPromise, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { Lambda } from '@aws-sdk/client-lambda';
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

export interface AlphaResponse<ResponseData = any, ConfigData = any> extends AxiosResponse<ResponseData> {
  config: AlphaOptions<ConfigData> & InternalAxiosRequestConfig;
}

export type SignAwsV4Config =
  & Omit<SignatureV4Constructor, SignatureV4Optionals>
  & Partial<Pick<SignatureV4Constructor, SignatureV4Optionals>>;

export interface AlphaOptions<D = any> extends AxiosRequestConfig<D> {
  retry?: RetryOptions | boolean;
  lambda?: Handler;
  context?: Context;
  signAwsV4?: SignAwsV4Config;
  /**
   * (Optional) The AWS endpoint to use when invoking the target Lambda function.
   */
  lambdaEndpoint?: string;
  Lambda?: typeof Lambda;
}

export type AlphaOptionsForLambda<D = any> = AlphaOptions<D> & InternalAxiosRequestConfig;

export type AlphaAdapter<V = AlphaOptions> = (config: V) => AxiosPromise;
export type AlphaInterceptor<V = AlphaOptions> = (config: V) => (Promise<V> | V);

export interface HandlerRequest<T = Record<string, any>> {
  event: T;
  context: Context;
}
