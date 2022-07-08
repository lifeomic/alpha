import { Sha256 } from '@aws-crypto/sha256-browser';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { parseUrl } from '@aws-sdk/url-parser';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import {
  HttpRequest,
  HeaderBag,
} from '@aws-sdk/types';

import buildURL from 'axios/lib/helpers/buildURL';
import transformData from 'axios/lib/core/transformData';
import buildFullPath from 'axios/lib/core/buildFullPath';

import type { Alpha } from '../alpha';
import type { AlphaInterceptor, AlphaOptions } from '../types';
import { matchHost } from '../utils/aws';
import { isLambdaUrl, LambdaUrl, parseLambdaUrl } from '../utils/url';

// All values need to be lowercase because SignatureV4 converts the headers to lowercase before calling has.
const unsignableHeaders = new Set([
  // Axios headers to ignore
  'common',
  'delete',
  'get',
  'head',
  'post',
  'put',
  'patch',
  // Other headers to ignore
  'authorization',
  'connection',
  'x-amzn-trace-id',
  'user-agent',
  'expect',
  'presigned-expires',
  'range',
]);

const combineParams = (url: string, { params, paramsSerializer }: AlphaOptions): HttpRequest['query'] => {
  const fullUrl = buildURL(url, params, paramsSerializer);
  const { query } = parseUrl(fullUrl);
  return query;
};

const getHeaders = (hostname: string, { headers: baseHeaders }: AlphaOptions) => {
  const headers = Object.assign({}, baseHeaders) as HeaderBag;
  if (!(headers.host || headers.Host)) {
    headers.Host = hostname;
  }
  return headers;
};

const awsV4Signature: AlphaInterceptor = async (config) => {
  if (!config.signAwsV4) {
    return config;
  }

  let fullPath = buildFullPath(config.baseURL, config.url);
  if (isLambdaUrl(fullPath)) {
    const lambdaUrl = parseLambdaUrl(fullPath) as LambdaUrl;
    fullPath = `lambda://${lambdaUrl.name}${lambdaUrl.path}`;
  }
  const { hostname, protocol, pathname: path, port } = new URL(fullPath);

  const { serviceCode, regionCode } = matchHost(hostname);

  const {
    credentials = defaultProvider(),
    service = serviceCode,
    region = regionCode,
    sha256 = Sha256,
    ...optionals
  } = config.signAwsV4;

  const signer = new SignatureV4({
    credentials,
    region,
    sha256,
    service,
    ...optionals,
  });

  const httpRequest: HttpRequest = {
    method: (config.method as string).toUpperCase(),
    protocol,
    hostname,
    path,
    port: port ? Number.parseInt(port) : undefined,
    headers: getHeaders(hostname, config),
    query: combineParams(fullPath, config),
    body: transformData.call(config, config.data, config.headers, config.transformRequest),
  };

  const signed = await signer.sign(httpRequest, {
    unsignableHeaders,
  });
  config.headers = Object.assign({}, config.headers, signed.headers);

  return config;
};

export const setup = (client: Alpha) => {
  client.interceptors.request.use(awsV4Signature);
};
