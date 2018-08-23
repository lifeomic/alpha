const assert = require('assert');
const AWS = require('aws-sdk');
const chainAdapters = require('./helpers/chainAdapters');
const lambdaEvent = require('./helpers/lambdaEvent');
const lambdaResponse = require('./helpers/lambdaResponse');
const parseLambdaUrl = require('./helpers/parseLambdaUrl');
const RequestError = require('./helpers/RequestError');

async function lambdaInvocationAdapter (config) {
  const Lambda = config.Lambda || AWS.Lambda;
  const lambda = new Lambda({
    endpoint: process.env.LAMBDA_ENDPOINT
  });
  const parts = parseLambdaUrl(config.url);
  assert(parts, `The config.url, '${config.url}' does not appear to be a Lambda Function URL`);

  const functionName = parts.name;
  const functionQualifier = parts.qualifier;
  const path = parts.path;

  const request = {
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(lambdaEvent(config, path))
  };

  if (functionQualifier) {
    request.Qualifier = functionQualifier;
  }

  const awsRequest = lambda.invoke(request);
  const result = await new Promise(async (resolve, reject) => {
    let timeout;
    try {
      if (config.timeout) {
        timeout = setTimeout(() => {
          const requestError = new RequestError(`Timeout after ${config.timeout}ms`, config, request);
          // ECONNABORTED is the code axios uses for HTTP timeout errors, so this gives
          // a code to consumers which is consistent across HTTP and lambda requests.
          requestError.code = 'ECONNABORTED';
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

  const payload = JSON.parse(result.Payload);
  if (!payload) {
    const message = `Unexpected Payload shape from ${config.url}. The full response was\n${JSON.stringify(result, null, '  ')}`;
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

function lambdaInvocationRequestInterceptor (config) {
  return chainAdapters(
    config,
    (config) => config.url.startsWith('lambda:'),
    lambdaInvocationAdapter
  );
}

module.exports = (client) => {
  client.interceptors.request.use(lambdaInvocationRequestInterceptor);
};
