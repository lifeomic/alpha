import assert from 'assert';
import AWS from 'aws-sdk';
import { InvocationRequest, InvocationResponse } from 'aws-sdk/clients/lambda';
import { isAbsoluteURL } from './helpers/isAbsoluteURL';
import { chainAdapters } from './helpers/chainAdapters';
import { lambdaEvent } from './helpers/lambdaEvent';
import { lambdaResponse, Payload } from './helpers/lambdaResponse';
import { parseLambdaUrl } from './helpers/parseLambdaUrl';
import { RequestError } from './helpers/requestError';
import { AlphaOptions, AlphaAdapter } from '../types';
import { Alpha } from '../alpha';

const lambdaInvocationAdapter: AlphaAdapter = async (config) => {
  const Lambda = config.Lambda || AWS.Lambda;
  const lambdaOptions: AWS.Lambda.Types.ClientConfiguration = {
    endpoint: config.lambdaEndpoint || process.env.LAMBDA_ENDPOINT,
  };

  if (config.timeout) {
    // Set some low level HTTP client timeout options
    // so that the system level resources will be
    // cleaned up quickly
    lambdaOptions.httpOptions = {
      connectTimeout: config.timeout,
      timeout: config.timeout,
    };
  }

  const lambda = new Lambda(lambdaOptions);
  if (config.baseURL && !isAbsoluteURL(config.url as string)) {
    config.url = `${config.baseURL}${config.url}`;
  }
  const parts = parseLambdaUrl(config.url as string);
  assert(parts, `The config.url, '${config.url}' does not appear to be a Lambda Function URL`);

  const functionName = parts.name;
  const functionQualifier = parts.qualifier;
  const path = parts.path as string;

  const request: InvocationRequest = {
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(lambdaEvent(config, path)),
  };

  if (functionQualifier) {
    request.Qualifier = functionQualifier;
  }

  const awsRequest = lambda.invoke(request);
  const result = await new Promise<InvocationResponse>((resolve, reject) => {
    let timeout: NodeJS.Timeout | undefined;

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

    const clrTimeout = () => {
      if (timeout) clearTimeout(timeout);
    };

    const execute = async () => {
      const result = await awsRequest.promise();
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    execute().catch((error) => {
      clrTimeout();
      reject(error);
    });
  });

  const payload = result.Payload && JSON.parse(result.Payload as string) as Payload | undefined;
  if (!payload) {
    const message = `Unexpected Payload shape from ${config.url}. The full response was\n${JSON.stringify(result, null, '  ')}`;
    throw new RequestError(message, config, request);
  }

  if (result.FunctionError) {
    // With Unhandled errors, AWS will provide an errorMessage attribute
    // in the payload with details.
    //
    // With `Handled` errors the thrown expectation will be converted into a
    // payload for each language. Each language seems to provide a `errorMessage`
    // attribute. The details of the Node.js behavior can be found at:
    // https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-mode-exceptions.html
    throw new RequestError(payload.errorMessage, config, request);
  }

  return lambdaResponse(config, request, payload);
};

const lambdaInvocationRequestInterceptor = (config: AlphaOptions) => {
  return chainAdapters(
    config,
    (config) => (config.url as string).startsWith('lambda:') || (config.baseURL?.startsWith('lambda:')),
    lambdaInvocationAdapter,
  );
};

export const setup = (client: Alpha) => {
  client.interceptors.request.use(lambdaInvocationRequestInterceptor);
};
