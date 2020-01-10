import lambdaEvent from '../utils/lambdaEvent';
import lambdaResponse from '../utils/lambdaResponse';
import promisify from '../utils/promisify';
import RequestError from '../utils/RequestError';
import {AlphaConfig, LambdaRequestPayload, LambdaResponse, LambdaResponsePayload} from '../types';
import {AxiosPromise, AxiosRequestConfig} from 'axios';

async function lambdaHandlerAdapter (config: AlphaConfig): Promise<LambdaResponse> {
  const request: LambdaRequestPayload = {
    context: {},
    event: lambdaEvent(config)
  };

  const handler = promisify<LambdaResponsePayload>(config.lambda!);

  try {
    const result = await handler(request.event, request.context);
    return lambdaResponse(config, request, result);
  } catch (error) {
    throw new RequestError(error.message, config, request);
  }
}

export default (request: AxiosRequestConfig): AxiosPromise => lambdaHandlerAdapter(request as AlphaConfig) as AxiosPromise;
