const querystring = require('querystring');
const { URL } = require('url');

module.exports = (config) => {
  const url = new URL(config.url, 'http://localhost');

  const event = {
    body: config.data || '',
    headers: config.headers,
    httpMethod: config.method.toUpperCase(),
    path: url.pathname,
    queryStringParameters: querystring.parse(url.searchParams.toString())
  };

  return event;
};
