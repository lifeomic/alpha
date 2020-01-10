import {LambdaRequestPayload, LambdaResponse} from '../types';
import {AxiosRequestConfig, AxiosResponse} from 'axios';
import AWS from 'aws-sdk';

export default class RequestError<
  Request = LambdaRequestPayload | AWS.Lambda.InvocationRequest,
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
