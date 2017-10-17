const WITH_SCHEME = /^[a-z][a-z\d+\-.]*:\/\//i;

module.exports = (url) => {
  return WITH_SCHEME.test(url) || url.startsWith('//');
};
