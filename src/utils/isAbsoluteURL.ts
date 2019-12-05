const WITH_SCHEME = /^[a-z][a-z\d+\-.]*:\/\//i;

export default (url: string | undefined) => {
  return url && (WITH_SCHEME.test(url) || url.startsWith('//'));
};
