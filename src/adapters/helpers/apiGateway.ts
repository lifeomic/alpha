import { AxiosRequestHeaders } from 'axios';
import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Copy headers into multiValueHeaders.
 * Needed for invoking @vendia/serverless-express handlers.
 * https://github.com/apollographql/apollo-server/issues/5504
 */
export type ToProxyHeaders = Pick<APIGatewayProxyEvent, 'multiValueHeaders' | 'headers'>;
export const toProxyHeaders = (headers: AxiosRequestHeaders = {}): ToProxyHeaders => {
  const response: ToProxyHeaders = {
    multiValueHeaders: {},
    headers: {}
  };
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === 'string') {
      response.headers[key] = value;
      response.multiValueHeaders[key] = value.split(',').map((v) => v.trim());
    } else if (value !== undefined) {
      response.headers[key] = `${value}`;
      response.multiValueHeaders[key] = [`${value}`];
    } else {
      response.headers[key] = value;
      response.multiValueHeaders[key] = value;
    }
  });
  return response;
}
