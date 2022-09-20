import http from 'http';
import { RequestError } from './requestError';
import { TextEncoder } from 'util';

import type { AlphaOptions } from '../../types';
import type { AxiosResponse } from 'axios';
import { HandlerRequest } from '../../types';

export interface Payload {
  body: string;
  headers: AxiosResponse['headers'];
  statusCode: AxiosResponse['status'];
  errorMessage: string;
}

const payloadToData = (config: AlphaOptions, payload: Payload) => {
  if (!config.responseType) return payload.body;

  switch (config.responseType) {
    case 'arraybuffer': return new TextEncoder().encode(payload.body);
    default: throw new Error('Unhandled responseType requested: ' + config.responseType);
  }
};

export const lambdaResponse = <Request extends Record<string, any> = Record<string, any>>(
  config: AlphaOptions,
  request: Request | HandlerRequest,
  payload: Payload,
): AxiosResponse => {
  const data = payloadToData(config, payload);

  const response: AxiosResponse = {
    config,
    data,
    headers: payload.headers,
    request,
    status: payload.statusCode,
    statusText: http.STATUS_CODES[payload.statusCode] as string,
  };

  if (typeof config.validateStatus === 'function' && !config.validateStatus(response.status)) {
    throw new RequestError(`Request failed with status code ${response.status}`, config, request, response);
  }

  return response;
};
