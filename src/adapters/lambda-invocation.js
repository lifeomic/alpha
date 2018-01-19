const AWS = require('aws-sdk');
const lambdaEvent = require('./helpers/lambdaEvent');
const lambdaResponse = require('./helpers/lambdaResponse');
const url = require('url');
const RequestError = require('./helpers/RequestError');
const toLower = require('lodash/toLower');

async function lambdaInvocationAdapter (config) {
  const lambda = new AWS.Lambda({
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

  const result = await lambda.invoke(request).promise();
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
