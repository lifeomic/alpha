import {LambdaRequestPayload, LambdaResponse} from '../types';
import {AxiosRequestConfig, AxiosResponse} from 'axios';
import Lambda from 'aws-sdk/clients/lambda';

export class RequestError<
  Request = LambdaRequestPayload | Lambda.InvocationRequest,
  Response = LambdaResponse | AxiosResponse
  > extends Error {
  public code: string | undefined;
  public isLambdaInvokeTimeout: boolean = false;

  constructor (
    message: string,
    public config: AxiosRequestConfig,
    public request: Request,
    public response?: Response
  ) {
    super(message);
  }
}
