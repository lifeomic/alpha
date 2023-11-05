import type { AxiosPromise, AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from 'axios';
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


export type SignAwsV4Config =
  & Omit<SignatureV4Constructor, SignatureV4Optionals>
  & Partial<Pick<SignatureV4Constructor, SignatureV4Optionals>>;

interface AlphaExtendedRequestConfig {
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

export interface AlphaRequestConfig<D = any> extends AxiosRequestConfig<D>, AlphaExtendedRequestConfig {}

export interface InternalAlphaRequestConfig<D = any> extends AlphaRequestConfig<D> {
  headers: AxiosRequestHeaders;
}

export interface AlphaResponse<T = any, D = any> extends AxiosResponse<T, D> {
  config: InternalAlphaRequestConfig<D>
}

export type AlphaAdapter = (config: InternalAlphaRequestConfig) => AxiosPromise;
export type AlphaInterceptor = (config: InternalAlphaRequestConfig) => (Promise<InternalAlphaRequestConfig> | InternalAlphaRequestConfig);

export interface HandlerRequest<T = Record<string, any>> {
  event: T;
  context: Context;
}
