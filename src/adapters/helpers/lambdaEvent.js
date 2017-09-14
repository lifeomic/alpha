const url = require('url');

module.exports = (config) => {
  const parts = url.parse(config.url, true);

  const event = {
    body: config.data || '',
    headers: config.headers,
    httpMethod: config.method.toUpperCase(),
    path: parts.pathname,
    queryStringParameters: parts.query
  };

  return event;
};
