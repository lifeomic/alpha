import axios from 'axios';
import cloneDeep from 'lodash/cloneDeep';
import Lambda from 'aws-lambda';


import interceptors from './interceptors';
import {AlphaConfig, LambdaResponsePayload} from './types';

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

  return configureAxios({target: handler, config: clientOptions});
}

export default function configureAxios (
  {
    target: lambda,
    config = {},
    url: baseURL,
    ignoreRedirects
  }: ConfigureArgs = {}
) {
  const defaults: AlphaConfig = {baseURL};
  if (!ignoreRedirects) {
    defaults.validateStatus = validateStatus;
  }

  const options = cloneDeep<AlphaConfig>(Object.assign({}, axios.defaults, defaults, config));
  options.lambda = options.lambda || lambda;

  const alpha = axios.create(options);

  interceptors(alpha);

  return alpha;
}

