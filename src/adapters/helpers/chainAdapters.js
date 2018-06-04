module.exports = (config, predicate, adapter) => {
  const nextAdapter = config.adapter;

  config.adapter = async (config) => {
    if (predicate(config)) {
      return adapter(config);
    }
    return nextAdapter(config);
  };

  return config;
};
