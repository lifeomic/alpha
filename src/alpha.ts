import pick from 'lodash/pick';
import merge from 'lodash/merge';

import axios, { Axios, AxiosAdapter, AxiosHeaders, AxiosResponse } from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import { AlphaOptions, AlphaResponse, HandlerRequest } from './types';
import { Handler } from 'aws-lambda';

import { adapters } from './adapters';
import { interceptors } from './interceptors';
import { RequestError } from './adapters/helpers/requestError';
import { resolve } from './resolve';
import { InvocationRequest } from '@aws-sdk/client-lambda';

const ALPHA_CONFIG = ['adapter', 'lambda', 'Lambda', 'retry', '__retryCount'];

const buildConfig = (client: Alpha, options: AlphaOptions) => {
  const config = cloneDeep(options);
  config.adapter = {
    ...pick(client.defaults, ALPHA_CONFIG),
    ...pick(config, ALPHA_CONFIG),
  } as AxiosAdapter;
  return config;
};

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
    const tmpOptions: AlphaOptions = { headers: new AxiosHeaders() };
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
    interceptors.forEach((adapter) => adapter(this));
  }

  async request <T = any, R = AxiosResponse<T>>(config: AlphaOptions): Promise<R> {
    const maxRedirects = config.maxRedirects ?? 5;
    // Need to override the default redirect logic to allow different adapters
    // to interact.
    const requestConfig = buildConfig(this, config);
    requestConfig.maxRedirects = 0;

    const response = await super.request<T, R>(requestConfig);

    const castResp = response as any as AxiosResponse;

    if (castResp.status === 301 || castResp.status === 302) {
      if (maxRedirects === 0) {
        const request = castResp.request as InvocationRequest | HandlerRequest;
        throw new RequestError('Exceeded maximum number of redirects.', castResp.config, request, castResp);
      }

      const redirect = cloneDeep(config);
      redirect.maxRedirects = maxRedirects - 1;
      redirect.url = resolve(castResp.headers.location as string, castResp.config.url);
      return this.request(redirect);
    }

    return response as R;
  }

  get<T = any, R = AlphaResponse<T>, D = any>(url: string, config?: AlphaOptions<D>): Promise<R> {
    return super.get<T, R, D>(url, config);
  }
  delete<T = any, R = AlphaResponse<T>, D = any>(url: string, config?: AlphaOptions<D>): Promise<R> {
    return super.delete(url, config);
  }
  head<T = any, R = AlphaResponse<T>, D = any>(url: string, config?: AlphaOptions<D>): Promise<R> {
    return super.head(url, config);
  }
  options<T = any, R = AlphaResponse<T>, D = any>(url: string, config?: AlphaOptions<D>): Promise<R> {
    return super.options(url, config);
  }
  post<T = any, R = AlphaResponse<T>, D = any>(url: string, data?: D, config?: AlphaOptions<D>): Promise<R> {
    return super.post(url, data, config);
  }
  put<T = any, R = AlphaResponse<T>, D = any>(url: string, data?: D, config?: AlphaOptions<D>): Promise<R> {
    return super.put(url, data, config);
  }
  patch<T = any, R = AlphaResponse<T>, D = any>(url: string, data?: D, config?: AlphaOptions<D>): Promise<R> {
    return super.patch(url, data, config);
  }
}
