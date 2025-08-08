import { RawAxiosRequestHeaders } from 'axios';
import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Copy headers into multiValueHeaders.
 * Needed for invoking @vendia/serverless-express handlers.
 * https://github.com/apollographql/apollo-server/issues/5504
 */
export type ToProxyHeaders = Pick<
  APIGatewayProxyEvent,
  'multiValueHeaders' | 'headers'
>;
export const toProxyHeaders = (
  headers: RawAxiosRequestHeaders = {},
): ToProxyHeaders => {
  const response: ToProxyHeaders = {
    multiValueHeaders: {},
    headers: {},
  };
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (typeof value === 'string') {
      response.headers[key] = value;
      response.multiValueHeaders[key] = value.split(',').map((v) => v.trim());
    } else {
      response.headers[key] = String(value);
      response.multiValueHeaders[key] = [String(value)];
    }
  }
  return response;
};
