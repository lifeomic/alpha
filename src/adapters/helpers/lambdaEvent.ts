import { AlphaOptions } from '../../types';

import urlParse from 'url-parse';
import querystring from 'querystring';
import { v4 as uuid } from 'uuid';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { toProxyHeaders } from './apiGateway';

export const lambdaEvent = (config: AlphaOptions, relativeUrl?: string) => {
  // url-parse needs a location to properly handle relative urls, so provide a fake one here:
  const parts = urlParse(
    relativeUrl ?? config.url as string,
    'http://fake',
    querystringWithArraySupport,
  );
  const params: Record<string, any> = Object.assign({}, parts.query, config.params);
  let multiValueParams: Record<string, any[]> | null = null;

  const hasMultiValueParams = Object.values(params).some((value) => Array.isArray(value));

  if (hasMultiValueParams) {
    Object.entries(params).forEach(([key, value]) => {
      multiValueParams = multiValueParams || {};
      if (Array.isArray(value)) {
        multiValueParams[key] = value;
        delete params[key];
      }
    });
  }

  const httpMethod = (config.method as string).toUpperCase();
  const requestTime = new Date();

  /**
   * A mock API Gateway v1 proxy event.
   * See here for more info: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html#apigateway-example-event
   * The APIGatewayProxyEvent type can be imported from the aws-lambda npm package.
   */
  const event: APIGatewayProxyEvent = {
    body: config.data || '',
    ...toProxyHeaders(config.headers),
    httpMethod,
    path: parts.pathname,
    queryStringParameters: params,
    isBase64Encoded: false,
    pathParameters: null,
    stageVariables: null,
    resource: '',
    requestContext: {
      stage: '',
      requestId: uuid(),
      apiId: 'alpha',
      protocol: 'http',
      accountId: '',
      authorizer: {},
      resourceId: '',
      requestTime: requestTime.toISOString(),
      requestTimeEpoch: requestTime.getTime() / 1e3,
      resourcePath: '',
      httpMethod,
      path: '',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: null,
        userArn: null,
      },
    },
    multiValueQueryStringParameters: multiValueParams,
  };

  if (Buffer.isBuffer(event.body)) {
    event.body = event.body.toString('base64');
    event.isBase64Encoded = true;
  }

  return event;
};

/**
 * This mirrors the simple query stringify parser, except it creates an array of duplicate keys
 * instead of only using the first key and discarding all subsequent ones, which is how url.parse functioned until urlParse replaced it.
 * Need to support that array for receiving services to continue functioning correctly (such as multiple _tag keys for FHIR object queries)
 */
export const querystringWithArraySupport = (query: string) => {
  if (query.startsWith('?')) {
    query = query.substring(1);
  }
  return querystring.parse(query);
};
