import pick from 'lodash/pick';
import merge from 'lodash/merge';

import axios, { Axios, AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import { AlphaOptions } from './types';
import { Handler } from 'aws-lambda';

import { adapters } from './adapters';
import { RequestError } from './adapters/helpers/requestError';
import { resolve } from './resolve';

const ALPHA_CONFIG = [ 'adapter', 'lambda', 'Lambda', 'retry', '__retryCount' ];

const buildConfig = (client: Alpha, options: AlphaOptions) => {
  const config = cloneDeep(options);
  config.adapter = {
    ...pick(client.defaults, ALPHA_CONFIG),
    ...pick(config, ALPHA_CONFIG)
  } as AxiosAdapter;
  return config;
}

type ConstructorArgs =
  | []
  | [string | Handler]
  | [string | Handler, AlphaOptions]
  | [AlphaOptions];

export class Alpha extends Axios {
  constructor()
  constructor(config: AlphaOptions)
  constructor(target: string | Handler)
  constructor(target: string | Handler, config: AlphaOptions)
  constructor (...[target, config]: ConstructorArgs) {
    const tmpOptions: AlphaOptions = {};
    if (typeof target === 'object') {
      Object.assign(tmpOptions, target);
    } else if (typeof target === 'string') {
      tmpOptions.baseURL = target;
    } else if (typeof target === 'function') {
      tmpOptions.lambda = target;
    }

    if (config) {
      Object.assign(tmpOptions, config);
    }

    // Override the default validateStatus to allow redirects to process
    if (!tmpOptions.validateStatus) {
      tmpOptions.validateStatus = (status) => (status >= 200 && status < 300) ||
        status === 301 ||
        status === 302;
    }

    const options = merge({}, axios.defaults, tmpOptions);
    super(options);
    adapters.forEach((adapter) => adapter(this));
  }

  async request <T = any, R = AxiosResponse<T>>(config: AxiosRequestConfig): Promise<R> {
    const maxRedirects = config.maxRedirects ?? 5;
    // Need to override the default redirect logic to allow different adapters
    // to interact.
    const requestConfig = buildConfig(this, config);
    requestConfig.maxRedirects = 0;

    const response = await super.request<T, R>(requestConfig);

    const castResp = response as any as AxiosResponse;

    if (castResp.status === 301 || castResp.status === 302) {
      if (maxRedirects === 0) {
        throw new RequestError('Exceeded maximum number of redirects.', castResp.config, castResp.request, response);
      }

      const redirect = cloneDeep(config);
      redirect.maxRedirects = maxRedirects - 1;
      redirect.url = resolve(castResp.headers['location'], castResp.config.url!);
      return this.request(redirect);
    }

    return response as R;
  }
}
