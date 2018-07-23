const url = require('url');

module.exports = (config, relativeUrl) => {
  const parts = url.parse(relativeUrl || config.url, true);
  const params = Object.assign({}, parts.query, config.params);

  const event = {
    body: config.data || '',
    headers: config.headers,
    httpMethod: config.method.toUpperCase(),
    path: parts.pathname,
    queryStringParameters: params
  };

  if (Buffer.isBuffer(event.body)) {
    event.body = event.body.toString('base64');
    event.isBase64Encoded = true;
  }

  return event;
};
