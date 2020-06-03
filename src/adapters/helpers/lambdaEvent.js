const urlParse = require('url-parse');

module.exports = (config, relativeUrl) => {
  const parts = urlParse(relativeUrl || config.url, null, querystringWithArraySupport);
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

/**
 * This mirrors the simple querystringify parser, except it creates an array of duplicate keys
 * instead of only using the first key and discarding all subsequent ones, which is how url.parse functioned until urlParse replaced it.
 * Need to support that array for receiving services to continue functioning correctly (such as multiple _tag keys for FHIR object queries)
 */
function querystringWithArraySupport (query) {
  const parser = /([^=?&]+)=?([^&]*)/g;
  const result = {};

  let part = parser.exec(query);
  while (part) {
    const key = decode(part[1]);
    const value = decode(part[2]);

    //
    // Prevent overriding of existing properties. This ensures that build-in
    // methods like `toString` or __proto__ are not overriden by malicious
    // querystrings.
    //
    // In the case it failed decoding, we want to omit the key/value pairs
    // from the result.
    //
    if (key !== null && value !== null) {
      if (key in result) {
        if (!Array.isArray(result[key])) {
          result[key] = [result[key]];
        }
        result[key].push(value);
      } else {
        result[key] = value;
      }
    }
    part = parser.exec(query);
  }

  return result;
}

function decode (input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, ' '));
  } catch (e) {
    return null;
  }
}
