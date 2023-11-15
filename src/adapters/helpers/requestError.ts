import { InvocationRequest, InvocationResponse } from '@aws-sdk/client-lambda';
import { HandlerRequest } from '../../types';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const isAxiosError = (err: any): err is AxiosError =>
  (typeof err === 'object') && !!err.isAxiosError;

export const isAlphaRequestError = (err: any): err is RequestError =>
  (typeof err === 'object') && !!err.isAlphaRequestError;

export class RequestError extends Error implements Omit<AxiosError, 'response' | 'toJSON' | 'isAxiosError'> {
  public code?: string;
  public isLambdaInvokeTimeout?: boolean;
  public isAlphaRequestError = true;

  constructor (
    message: string,
    public config: InternalAxiosRequestConfig,
    public request: InvocationRequest | HandlerRequest,
    public response?: InvocationResponse | AxiosResponse,
  ) {
    super(message);
  }
}
