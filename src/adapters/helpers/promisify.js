const isPromiseLike = (maybe) => {
  return (
    maybe !== null &&
    (typeof maybe === 'object' || typeof maybe === 'function') &&
    typeof maybe.then === 'function'
  );
};

module.exports = (fn) => {
  return (...parameters) =>
    new Promise((resolve, reject) => {
      const callback = (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      };

      parameters.push(callback);

      const returnVal = fn(...parameters);

      // if the function returns a promise like
      // value, resolve the top level promise
      // with its results
      if (isPromiseLike(returnVal)) {
        returnVal.then(resolve, reject);
      }
      // otherwise let callback be invoked as normal
    });
};
