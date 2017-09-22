const { Axios } = require('axios');
const glob = require('glob');
const path = require('path');
const _ = require('lodash');

const adapters = glob.sync(path.join(__dirname, 'adapters/*.js')).map(require);

class Alpha extends Axios {
  constructor (target, options) {
    options = options || {};

    if (typeof target === 'function') {
      options.lambda = target;
    } else if (_.isString(target)) {
      options.baseURL = target;
    } else {
      options = target;
      target = null;
    }

    super(options);
    adapters.forEach((adapter) => adapter(this));
  }

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
}

module.exports = Alpha;
