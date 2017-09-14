const AWS = require('aws-sdk');
const lambdaEvent = require('./helpers/lambdaEvent');
const lambdaResponse = require('./helpers/lambdaResponse');
const url = require('url');

async function lambdaInvocationAdapter (config) {
  const lambda = new AWS.Lambda();
  const parts = url.parse(config.url);

  const request = {
    FunctionName: parts.hostname,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(lambdaEvent(config))
  };

  const result = await lambda.invoke(request).promise();
  const payload = JSON.parse(result.Payload);

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
