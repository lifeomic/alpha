const adapters = require('./adapters');
const cloneDeep = require('lodash/cloneDeep');
const isAbsoluteURL = require('./adapters/helpers/isAbsoluteURL');
const isString = require('lodash/isString');
const parseLambdaUrl = require('./adapters/helpers/parseLambdaUrl');
const pick = require('lodash/pick');
const RequestError = require('./adapters/helpers/RequestError');

const { Axios } = require('axios');
const { resolve } = require('url');
const { URL } = require('whatwg-url');

const ALPHA_CONFIG = [ 'adapter', 'lambda', 'Lambda', 'retry', '__retryCount' ];

class Alpha extends Axios {
  static dockerLambda (options, clientOptions) {
    const dockerLambda = require('docker-lambda');

    options = Object.assign(
      {
        taskDir: false
      },
      options
    );

    delete options.event;

    function handler (event, context, callback) {
      const requestOptions = Object.assign({ event }, options);
      callback(null, dockerLambda(requestOptions));
    }

    return new Alpha(handler, clientOptions);
  }

  // whatwg-url does not accept non-numeric port values. Alpha uses the port
  // value as the lambda qualifier. However, URL resolution can have tricky
  // edge cases. We remove the lambda qualifier to allow whatwg-url to handle
  // the URL resolution nuances and then reinsert the lambda qualifier (if
  // present).
  static resolve (url, base) {
    if (isAbsoluteURL(url)) {
      return url;
    }

    let lambdaParts = parseLambdaUrl(base);

    if (!lambdaParts) {
      // whatwg-url doesn't like simple paths
      return resolve(base, url);
    }

    const qualifier = lambdaParts.qualifier ? `:${lambdaParts.qualifier}` : '';
    const sanitizedBase = `lambda://${lambdaParts.name}:0${lambdaParts.path}`;
    const resolved = new URL(url, sanitizedBase).toString();

    lambdaParts = parseLambdaUrl(resolved);
    return `lambda://${lambdaParts.name}${qualifier}${lambdaParts.path}`;
  }

  constructor (target, options) {
    options = options ? cloneDeep(options) : {};

    if (typeof target === 'function') {
      options.lambda = target;
    } else if (isString(target)) {
      options.baseURL = target;
    } else if (target) {
      options = cloneDeep(target);
      target = null;
    }

    // Override the default validateStatus to allow redirects to process
    if (!options.validateStatus) {
      options.validateStatus = (status) => (status >= 200 && status < 300) ||
        status === 301 ||
        status === 302;
    }

    super(options);
    adapters.forEach((adapter) => adapter(this));
  }

  async request (config) {
    const maxRedirects = 'maxRedirects' in config ? config.maxRedirects : 5;
    // Need to override the default redirect logic to allow different adapters
    // to interact.
    const requestConfig = this._buildConfig(config);
    requestConfig.maxRedirects = 0;

    // Babel does not correctly handle the super keyword in async methods
    const response = await Axios.prototype.request.call(this, requestConfig);

    if (response.status === 301 || response.status === 302) {
      if (maxRedirects === 0) {
        throw new RequestError('Exceeded maximum number of redirects.', response.config, response.request, response);
      }

      const redirect = cloneDeep(config);
      redirect.maxRedirects = maxRedirects - 1;
      redirect.url = this.constructor.resolve(response.headers['location'], response.config.url);
      return this.request(redirect);
    }

    return response;
  }

  _buildConfig (config) {
    config = cloneDeep(config);
    config.adapter = {
      ...pick(this.defaults, ALPHA_CONFIG),
      ...pick(config, ALPHA_CONFIG)
    };
    return config;
  }
}

module.exports = Alpha;
