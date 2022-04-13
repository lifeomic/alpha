const WITH_SCHEME = /^[a-z][a-z\d+\-.]*:\/\//i;

export const isAbsoluteURL = (url: string) => WITH_SCHEME.test(url) || url.startsWith('//');
