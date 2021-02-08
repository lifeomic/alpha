import axios, { AxiosResponse } from 'axios';
import pick from 'lodash/pick';
import cloneDeep from 'lodash/cloneDeep';
import Lambda from 'aws-lambda';

export { resolveUrl } from './utils/resolveUrl';
import { resolveUrl } from './utils/resolveUrl';

import { AlphaConfig, LambdaResponsePayload } from './types';

import { RequestError } from './utils/RequestError';

const adapters = require('./adapters');

const ALPHA_CONFIG = [ 'adapter', 'lambda', 'Lambda', 'retry', '__retryCount' ];

export interface ConfigureArgs {
  target?: Lambda.Handler<unknown, LambdaResponsePayload>;
  config?: Partial<AlphaConfig>;
  url?: string;
  ignoreRedirects?: boolean;
}

function validateStatus (status: number): boolean {
  return (status >= 200 && status < 300) ||
    status === 301 ||
    status === 302;
}

export function dockerLambda(options: {[key: string]: unknown}, clientOptions: Partial<AlphaConfig>) {
  const dockerLambda = require('docker-lambda');

  options = Object.assign(
    {
      taskDir: false
    },
    options
  );

  delete options.event;

  function handler (event: unknown, context: unknown, callback: (arg0: null, arg1: any) => void) {
    const requestOptions = Object.assign({ event }, options);
    callback(null, dockerLambda(requestOptions));
  }

  return configureAxios({ target: handler, config: clientOptions });
}

export function configureAxios (
  {
    target: lambda,
    config = {},
    url: baseURL,
    ignoreRedirects
  }: ConfigureArgs = {}
) {
  const defaults: AlphaConfig = { baseURL };
  if (!ignoreRedirects) {
    defaults.validateStatus = validateStatus;
  }

  const options = cloneDeep<AlphaConfig>(Object.assign({}, axios.defaults, defaults, config));
  options.lambda = options.lambda || lambda;

  const alpha = axios.create(options);

  adapters.forEach((adapter: any) => adapter(alpha));

  const _buildConfig = (origConfig: AlphaConfig): AlphaConfig => {
    const config = cloneDeep(origConfig);
    // @ts-ignore
    config.adapter = {
      ...pick(alpha.defaults, ALPHA_CONFIG),
      ...pick(config, ALPHA_CONFIG)
    };
    return config;
  }

  const axiosRequest = alpha.request;
  alpha.request = async function <T = any, R = AxiosResponse<T>>(config: AlphaConfig): Promise<R> {
    const maxRedirects = config.maxRedirects ?? 5;
    // Need to override the default redirect logic to allow different adapters
    // to interact.
    const requestConfig = _buildConfig(config);
    requestConfig.maxRedirects = 0;

    // Babel does not correctly handle the super keyword in async methods
    const response = await axiosRequest<T, R>(requestConfig);

    const { status, request, headers } = response as unknown as AxiosResponse<T>;

    if (status === 301 || status === 302) {
      if (maxRedirects === 0) {
        throw new RequestError('Exceeded maximum number of redirects.', config, request, response);
      }

      const redirect = cloneDeep(config);
      redirect.maxRedirects = maxRedirects - 1;
      redirect.url = resolveUrl(headers['location'], config.url);
      return this.request(redirect);
    }

    return response;
  }

  return alpha;
}
