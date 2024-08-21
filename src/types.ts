import type { AxiosPromise, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { Lambda, LambdaClientConfig } from '@aws-sdk/client-lambda';
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

export interface AlphaOptions<D = any> extends AxiosRequestConfig<D> {
  retry?: RetryOptions | boolean;
  lambda?: Handler;
  context?: Context;
  signAwsV4?: SignAwsV4Config;
  /**
   * (Optional) The AWS endpoint to use when invoking the target Lambda function.
   */
  lambdaEndpoint?: string;
  /**
   * (Optional) The AWS region to use when invoking the target Lambda function.
   */
  lambdaRegion?: LambdaClientConfig['region'];
  Lambda?: typeof Lambda;
}

export type InternalAlphaRequestConfig<D = any> = AlphaOptions<D> & InternalAxiosRequestConfig;

export type AlphaAdapter = (config: InternalAlphaRequestConfig) => AxiosPromise;
export type AlphaInterceptor = (config: InternalAlphaRequestConfig) => (Promise<InternalAlphaRequestConfig> | InternalAlphaRequestConfig);

export interface AlphaResponse<ResponseData = any, ConfigData = any> extends AxiosResponse<ResponseData> {
  config: InternalAlphaRequestConfig<ConfigData>;
}

export interface HandlerRequest<T = Record<string, any>> {
  event: T;
  context: Context;
}
