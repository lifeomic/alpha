module.exports = (fn) => {
  return (...parameters) => new Promise((resolve, reject) => {
    const callback = (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    };

    parameters.push(callback);
    fn(...parameters);
  });
};
