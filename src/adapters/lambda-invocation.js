const AWS = require('aws-sdk');
const lambdaEvent = require('./helpers/lambdaEvent');
const lambdaResponse = require('./helpers/lambdaResponse');
const url = require('url');
const RequestError = require('./helpers/RequestError');
const toLower = require('lodash/toLower');

async function lambdaInvocationAdapter (config) {
  const Lambda = config.Lambda || AWS.Lambda;
  const lambda = new Lambda({
    endpoint: process.env.LAMBDA_ENDPOINT
  });
  const parts = url.parse(config.url);

  const request = {
    FunctionName: parts.hostname,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(lambdaEvent(config))
  };

  if (parts.port) {
    request.Qualifier = parts.port;
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
