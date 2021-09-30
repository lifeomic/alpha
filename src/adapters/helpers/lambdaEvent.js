const urlParse = require('url-parse');
const querystring = require('querystring');

module.exports = (config, relativeUrl) => {
  // url-parse needs a location to properly handle relative urls, so provide a fake one here:
  const parts = urlParse(relativeUrl || config.url, 'http://fake', querystringWithArraySupport);
  const params = Object.assign({}, parts.query, config.params);

  const event = {
    body: config.data || '',
    headers: config.headers,
    httpMethod: config.method.toUpperCase(),
    path: parts.pathname,
    queryStringParameters: params,
    requestContext: config.requestContext
  };

  if (Buffer.isBuffer(event.body)) {
    event.body = event.body.toString('base64');
    event.isBase64Encoded = true;
  }

  return event;
};

/**
 * This mirrors the simple querystringify parser, except it creates an array of duplicate keys
 * instead of only using the first key and discarding all subsequent ones, which is how url.parse functioned until urlParse replaced it.
 * Need to support that array for receiving services to continue functioning correctly (such as multiple _tag keys for FHIR object queries)
 */
function querystringWithArraySupport (query) {
  if (query.startsWith('?')) {
    query = query.substring(1);
  }
  return querystring.parse(query);
}
