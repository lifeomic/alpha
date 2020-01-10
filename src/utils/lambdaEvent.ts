import urlParse from 'url-parse';
import { AxiosRequestConfig } from 'axios';
import {LambdaHttpEvent} from '../types';

export default (config: AxiosRequestConfig, relativeUrl?: string): LambdaHttpEvent => {
  const parts = urlParse(relativeUrl || config.url || config.baseURL!, true);
  const params = Object.assign({}, parts.query, config.params);

  const event: LambdaHttpEvent = {
    body: config.data || '',
    headers: config.headers,
    httpMethod: config.method!.toUpperCase(),
    path: parts.pathname,
    queryStringParameters: params
  };

  if (Buffer.isBuffer(event.body)) {
    event.body = event.body.toString('base64');
    event.isBase64Encoded = true;
  }

  return event;
};
