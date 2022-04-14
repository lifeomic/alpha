import { chainAdapters } from './helpers/chainAdapters';
import { isAbsoluteURL } from './helpers/isAbsoluteURL';
import { lambdaEvent } from './helpers/lambdaEvent';
import { lambdaResponse } from './helpers/lambdaResponse';
import { promisify } from './helpers/promisify';
import { RequestError } from './helpers/RequestError';
import { AlphaOptions, AlphaAdapter, HandlerRequest } from '../types';
import { v4 as uuid } from 'uuid';
import { Context } from 'aws-lambda';
import { Alpha } from '../Alpha';

const createContext = (provided?: Partial<Context>): Context => {
  const defaultCtx: Context = {
    awsRequestId: uuid(),
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'AlphaRequest',
    functionVersion: 'AlphaRequest',
    invokedFunctionArn: '',
    memoryLimitInMB: '256',
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: () => 0,
    done(){},
    fail(){},
    succeed(){},
  };
  return Object.assign({}, defaultCtx, provided);
}

const lambdaHandlerAdapter: AlphaAdapter = async (config) => {
  const request: HandlerRequest = {
    context: createContext(config.context),
    event: lambdaEvent(config)
  };

  const handler = promisify(config.lambda!);

  try {
    const result = await handler(request.event, request.context as Context);
    return lambdaResponse(config, request, result);
  } catch (error: any | Error) {
    throw new RequestError(error.message, config, request);
  }
}

const lambdaHandlerRequestInterceptor = (config: AlphaOptions) => chainAdapters(
  config,
  (config) => !isAbsoluteURL(config.url!) && config.lambda,
  lambdaHandlerAdapter
);

export const setup = (client: Alpha) => {
  client.interceptors.request.use(lambdaHandlerRequestInterceptor);
};
