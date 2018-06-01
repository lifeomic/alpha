const isAbsoluteURL = require('./helpers/isAbsoluteURL');
const lambdaEvent = require('./helpers/lambdaEvent');
const lambdaResponse = require('./helpers/lambdaResponse');
const promisify = require('./helpers/promisify');
const RequestError = require('./helpers/RequestError');

async function lambdaHandlerAdapter (config) {
  const request = {
    context: {},
    event: lambdaEvent(config)
  };

  const handler = promisify(config.lambda);
  let result = null;

  try {
    result = await handler(request.event, request.context);
  } catch (error) {
    throw new RequestError(error.message, config, request);
  }

  return lambdaResponse(config, request, result);
}

function lamdaHandlerRequestInterceptor (config) {
  if (!isAbsoluteURL(config.url) && config.lambda) {
    config.adapter = lambdaHandlerAdapter;
  }

  return config;
}

module.exports = (client) => {
  client.interceptors.request.use(lamdaHandlerRequestInterceptor);
};
