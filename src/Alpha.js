const { Axios } = require('axios');
const glob = require('glob');
const path = require('path');

const adapters = glob.sync(path.join(__dirname, 'adapters/*.js')).map(require);

class Alpha extends Axios {
  constructor (target) {
    const options = {};

    if (typeof target === 'function') {
      options.lambda = target;
    } else {
      options.baseURL = target;
    }

    super(options);
    adapters.forEach((adapter) => adapter(this));
  }
}

module.exports = Alpha;
