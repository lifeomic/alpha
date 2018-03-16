const AWS = require('aws-sdk');
const lambdaEvent = require('./helpers/lambdaEvent');
const lambdaResponse = require('./helpers/lambdaResponse');
const RequestError = require('./helpers/RequestError');
const toLower = require('lodash/toLower');
const assert = require('assert');

// This expression for the funtion name and qualfier was taken from:
// https://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-FunctionName
// eslint-disable-next-line security/detect-unsafe-regex
const LAMBDA_URL_PATTERN = new RegExp('^lambda://([a-zA-Z0-9-_]+)(:($LATEST|[a-zA-Z0-9-_]+))?(.*)');

async function lambdaInvocationAdapter (config) {
  const Lambda = config.Lambda || AWS.Lambda;
  const lambda = new Lambda({
    endpoint: process.env.LAMBDA_ENDPOINT
  });
  const parts = LAMBDA_URL_PATTERN.exec(config.url);
  assert(parts, `The config.url, '${config.url}' does not appear to be a Lambda Function URL`);

  const functionName = parts[1];
  const functionQualifier = parts[3];
  const path = parts[4];

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
    try {
      let requestCompleted = false;

      if (config.timeout) {
        setTimeout(() => {
          if (requestCompleted) {
            return;
          }
          const requestError = new RequestError(`Timeout after ${config.timeout}ms`, config, request);
          // ECONNABORTED is the code axios uses for HTTP timeout errors, so this gives
          // a code to consumers which is consistent across HTTP and lambda requests.
          requestError.code = 'ECONNABORTED';
          reject(requestError);

          awsRequest.abort();
        }, config.timeout);
      }

      const result = await awsRequest.promise();
      requestCompleted = true;
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });

  const payload = JSON.parse(result.Payload);

  if (toLower(result.FunctionError) === 'unhandled') {
    // With Unhandled FunctionErrors, AWS will provide an errorMessage attribute
    // in the payload with details
    throw new RequestError(payload.errorMessage, config, request);
  }

  return lambdaResponse(config, request, payload);
}

function lambdaInvocationRequestInterceptor (config) {
  if (config.url.startsWith('lambda:')) {
    config.adapter = lambdaInvocationAdapter;
  }

  return config;
}

module.exports = (client) => {
  client.interceptors.request.use(lambdaInvocationRequestInterceptor);
};
