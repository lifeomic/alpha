const WITH_SCHEME = /^[a-z][a-z\d+\-.]*:\/\//i;

export function isAbsoluteURL (url: string) {
  return WITH_SCHEME.test(url) || url.startsWith('//');
}
