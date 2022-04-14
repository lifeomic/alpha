import { InvocationRequest, InvocationResponse } from 'aws-sdk/clients/lambda';
import { HandlerRequest, AlphaOptions } from '../../types';
import { AxiosError, AxiosResponse } from 'axios';

export class RequestError extends Error implements Omit<AxiosError, 'response' | 'toJSON'> {
  public code?: string;
  public isLambdaInvokeTimeout?: boolean;
  public isAxiosError = false;

  constructor (
    message: string,
    public config: AlphaOptions,
    public request: InvocationRequest | HandlerRequest,
    public response?: InvocationResponse | AxiosResponse,
  ) {
    super(message);
  }
}
