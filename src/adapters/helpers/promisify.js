module.exports = (fn) => {
  return (...parameters) => new Promise((resolve, reject) => {
    const callback = (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    };

    parameters.push(callback);

    // This ensure both callback and promise style functions are supported.
    // 1) If fn is promise style, fn will ignore the always-passed callback
    // function. Thus, after finishing, we need to call through to
    // resolve/reject functions by using resolve + then() here.
    // 2) If fn is callback style, it'll call resolve/reject in the callback
    // function above which in turn resolves this promise. Because resolve/reject
    // were called in the callback, .then() will also call the same resolve or
    // reject a second time. However, this is okay because calling resolve/reject
    // multiple times is a no-opt.
    return Promise.resolve(fn(...parameters)).then(resolve, reject);
  });
};
