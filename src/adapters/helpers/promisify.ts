import { Context, Handler } from 'aws-lambda';

const isPromiseLike = (maybe: void | Promise<any>): maybe is Promise<any> => {
  return (
    maybe !== null &&
    (typeof maybe === 'object' || typeof maybe === 'function') &&
    ('then' in maybe && typeof maybe.then === 'function')
  );
};

export const promisify = (fn: Handler) => {
  return (event: any, context: Context) =>
    new Promise((resolve, reject) => {
      const callback = (error: any, result: any) => {
        if (error) {
          return reject(error);
        }

        return resolve(result);
      };

      const returnVal = fn(event, context, callback);

      // if the function returns a promise like
      // value, resolve the top level promise
      // with its results
      if (isPromiseLike(returnVal)) {
        returnVal.then(resolve, reject);
      }
      // otherwise let callback be invoked as normal
    });
};
