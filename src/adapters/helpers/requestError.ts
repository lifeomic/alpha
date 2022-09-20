import { HandlerRequest, AlphaOptions } from '../../types';
import { AxiosError, AxiosResponse } from 'axios';

export const isAxiosError = (err: any | AxiosError): err is AxiosError =>
  (typeof err === 'object') && !!err.isAxiosError;

export const isAlphaRequestError = (err: any | RequestError): err is RequestError =>
  (typeof err === 'object') && !!err.isAlphaRequestError;

export class RequestError<
  Request extends Record<string, any> = Record<string, any>,
  Response extends Record<string, any> = Record<string, any>
> extends Error implements Omit<AxiosError, 'response' | 'toJSON' | 'isAxiosError'> {
  public code?: string;
  public isLambdaInvokeTimeout?: boolean;
  public isAlphaRequestError = true;

  constructor (
    message: string,
    public config: AlphaOptions,
    public request: Request | HandlerRequest,
    public response?: Response | AxiosResponse,
  ) {
    super(message);
  }
}
