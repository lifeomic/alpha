const http = require('http');
const RequestError = require('./RequestError');
const { TextEncoder } = require('util');

const payloadToData = (config, payload) => {
  if (!config.responseType) return payload.body;

  switch (config.responseType) {
    case 'arraybuffer': return new TextEncoder().encode(payload.body);
    default: throw new Error('Unhandled responseType requested: ' + config.responseType);
  }
};

module.exports = (config, request, payload) => {
  const data = payloadToData(config, payload);

  const response = {
    config,
    data,
    headers: payload.headers,
    request,
    status: payload.statusCode,
    statusText: http.STATUS_CODES[payload.statusCode]
  };

  if (typeof config.validateStatus === 'function' && !config.validateStatus(response.status)) {
    throw new RequestError(`Request failed with status code ${response.status}`, config, request, response);
  }

  return response;
};
