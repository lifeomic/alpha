export default <T>(fn: Function) => {
  return (...parameters: any) => new Promise<T>((resolve, reject) => {
    const callback = (error: unknown, result: unknown) => {
      if (error) {
        return reject(error);
      }

      return resolve(result as T);
    };

    parameters.push(callback);
    fn(...parameters);
  });
};
