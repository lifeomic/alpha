const { Axios } = require('axios');
const isAbsoluteURL = require('./adapters/helpers/isAbsoluteURL');
const RequestError = require('./adapters/helpers/RequestError');
const url = require('url');
const { URL } = require('whatwg-url');
const _ = require('lodash');
const adapters = require('./adapters');

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

  constructor (target, options) {
    options = options ? _.cloneDeep(options) : {};

    if (typeof target === 'function') {
      options.lambda = target;
    } else if (_.isString(target)) {
      options.baseURL = target;
    } else if (target) {
      options = _.cloneDeep(target);
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
    config = _.cloneDeep(config);
    config.maxRedirects = 0;

    // Babel does not correctly handle the super keyword in async methods
    const response = await Axios.prototype.request.call(this, config);

    if (response.status === 301 || response.status === 302) {
      if (maxRedirects === 0) {
        throw new RequestError('Exceeded maximum number of redirects.', response.config, response.request, response);
      }

      const redirect = _.cloneDeep(config);
      redirect.maxRedirects = maxRedirects - 1;

      // Node's url.resolve does not correctly handle non-http schemes
      if (isAbsoluteURL(response.config.url)) {
        redirect.url = new URL(response.headers['location'], response.config.url).toString();
      } else {
        redirect.url = url.resolve(response.config.url, response.headers['location']);
      }

      return this.request(redirect);
    }

    return response;
  }
}

module.exports = Alpha;
