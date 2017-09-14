const lambdaEvent = require('./helpers/lambdaEvent');
const lambdaResponse = require('./helpers/lambdaResponse');
const util = require('util');

function isAbsoluteURL (url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

async function lambdaHandlerAdapter (config) {
  const request = {
    context: {},
    event: lambdaEvent(config)
  };

  const handler = util.promisify(config.lambda);
  const result = await handler(request.event, request.context);

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
