import AWS from 'aws-sdk';
import Lambda from 'aws-lambda';
import {AxiosRequestConfig} from 'axios';
import RequestError from './utils/RequestError';

export interface LambdaHttpEvent {
  body: string | Buffer;
  headers: Record<string, string>;
  httpMethod: string;
  path: string;
  queryStringParameters: Record<string, string>;
  isBase64Encoded?: boolean;
}

export interface LambdaRequestPayload {
  event: LambdaHttpEvent;
  context: unknown;
}
export interface LambdaResponsePayload {
  body: unknown;
  headers: Record<string, string>;
  statusCode: number;
}

export interface LambdaResponse {
  config: AlphaConfig;
  data: unknown;
  headers: Record<string, string>;
  request: unknown;
  status: number;
  statusText: string | undefined;
}


export interface RetryConfig {
  attempts?: number;
  factor?: number;
  maxTimeout?: number;
  retryCondition?: (error: RequestError) => boolean;
}

export interface AlphaLambda {
  new (...args: any): AWS.Lambda;
}

export interface AlphaConfig extends AxiosRequestConfig {
  Lambda?: AlphaLambda;
  lambda?: Lambda.Handler<unknown, LambdaResponsePayload>;
  retry?: RetryConfig | boolean;
  __retryCount?: number;
  __redirectCount?: number;
  __maxRedirects?: number;
}
