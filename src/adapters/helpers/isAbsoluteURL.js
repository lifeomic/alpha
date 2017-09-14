module.exports = (url) => {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};
