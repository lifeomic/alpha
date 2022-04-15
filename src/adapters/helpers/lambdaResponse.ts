import http from 'http';
import { RequestError } from './requestError';
import { TextEncoder } from 'util';

import type { AlphaOptions } from '../../types';
import type { InvocationRequest } from 'aws-sdk/clients/lambda';
import type { AxiosResponse } from 'axios';
import { HandlerRequest } from '../../types';

const payloadToData = (config: AlphaOptions, payload: any) => {
  if (!config.responseType) return payload.body;

  switch (config.responseType) {
    case 'arraybuffer': return new TextEncoder().encode(payload.body);
    default: throw new Error('Unhandled responseType requested: ' + config.responseType);
  }
};

export const lambdaResponse = (
  config: AlphaOptions,
  request: InvocationRequest | HandlerRequest,
  payload: any,
): AxiosResponse => {
  const data = payloadToData(config, payload);

  const response: AxiosResponse = {
    config,
    data,
    headers: payload.headers,
    request,
    status: payload.statusCode,
    statusText: http.STATUS_CODES[payload.statusCode]!
  };

  if (typeof config.validateStatus === 'function' && !config.validateStatus(response.status)) {
    throw new RequestError(`Request failed with status code ${response.status}`, config, request, response);
  }

  return response;
};
