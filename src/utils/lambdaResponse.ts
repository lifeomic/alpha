import http from 'http';
import AWS from 'aws-sdk';

import RequestError from './RequestError';
import {LambdaResponsePayload, LambdaResponse, LambdaRequestPayload, AlphaConfig} from '../types';

export default (config: AlphaConfig, request: LambdaRequestPayload | AWS.Lambda.InvocationRequest, payload: LambdaResponsePayload): LambdaResponse => {
  const response: LambdaResponse = {
    config,
    data: payload.body,
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
