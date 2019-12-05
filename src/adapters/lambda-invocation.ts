import assert from 'assert';
import AWS from 'aws-sdk';
import lambdaEvent from '../utils/lambdaEvent';
import lambdaResponse from '../utils/lambdaResponse';
import parseLambdaUrl from '../utils/parseLambdaUrl';
import RequestError from '../utils/RequestError';
import {AlphaConfig, LambdaResponse} from '../types';
import {AxiosPromise, AxiosRequestConfig} from 'axios';
import {resolveUrl} from '../utils/urlUtils';

async function lambdaInvocationAdapter (config: AlphaConfig): Promise<LambdaResponse> {
  const Lambda = config.Lambda || AWS.Lambda;
  const lambdaOptions: AWS.Lambda.Types.ClientConfiguration = {
    endpoint: process.env.LAMBDA_ENDPOINT
  };

  if (config.timeout) {
    // Set some low level HTTP client timeout options
    // so that the system level resources will be
    // cleaned up quickly
    lambdaOptions.httpOptions = {
      connectTimeout: config.timeout,
      timeout: config.timeout
    };
  }

  const lambda = new Lambda(lambdaOptions);
  const url = resolveUrl(config.url || '', config.baseURL || '');
  const parts = parseLambdaUrl(url);
  assert(parts, `The config.url, '${url}' does not appear to be a Lambda Function URL`);

  const functionName = parts.name;
  const functionQualifier = parts.qualifier;
  const path = parts.path;

  const request: AWS.Lambda.InvocationRequest = {
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(lambdaEvent(config, path))
  };

  if (functionQualifier) {
    request.Qualifier = functionQualifier;
  }

  const awsRequest = lambda.invoke(request);
  const result = await new Promise<AWS.Lambda.InvocationResponse>(async (resolve, reject) => {
    let timeout;
    try {
      if (config.timeout) {
        timeout = setTimeout(() => {
          const requestError = new RequestError(`Timeout after ${config.timeout}ms`, config, request);
          // ECONNABORTED is the code axios uses for HTTP timeout errors, so this gives
          // a code to consumers which is consistent across HTTP and lambda requests.
          requestError.code = 'ECONNABORTED';
          requestError.isLambdaInvokeTimeout = true;
          reject(requestError);

          awsRequest.abort();
        }, config.timeout);
      }

      const result = await awsRequest.promise();
      if (timeout) clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      reject(error);
    }
  });

  const payload = JSON.parse(result.Payload as string);
  if (!payload) {
    const message = `Unexpected Payload shape from ${url}. The full response was\n${JSON.stringify(result, null, '  ')}`;
    throw new RequestError(message, config, request);
  }

  if (result.FunctionError) {
    // With Unhandled errors, AWS will provide an errorMessage attribute
    // in the payload with details.
    //
    // With `Handled` errors the thrown expection will be converted into a
    // payload for each langage. Each language seems to provide a `errorMessage`
    // attribute. The details of the Node.js behavior can be found at:
    // https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-mode-exceptions.html
    throw new RequestError(payload.errorMessage, config, request);
  }

  return lambdaResponse(config, request, payload);
}

export default (request: AxiosRequestConfig): AxiosPromise => lambdaInvocationAdapter(request as AlphaConfig) as AxiosPromise;
