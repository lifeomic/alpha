import type { AxiosPromise, AxiosRequestConfig } from 'axios';
import type { Lambda } from '@aws-sdk/client-lambda';
import type { Context, Handler } from 'aws-lambda';

export interface RetryOptions {
  attempts?: number;
  factor?: number;
  maxTimeout?: number;
  retryCondition?: (err: Error) => boolean;
}

export interface AlphaOptions extends AxiosRequestConfig {
  retry?: RetryOptions | boolean;
  lambda?: Handler;
  context?: Context;
  /**
   * (Optional) The AWS endpoint to use when invoking the target Lambda function.
   */
  lambdaEndpoint?: string;
  Lambda?: typeof Lambda;
}

export interface AlphaAdapter {
  (config: AlphaOptions): AxiosPromise;
}

export interface HandlerRequest<T = Record<string, any>> {
  event: T;
  context: Context;
}