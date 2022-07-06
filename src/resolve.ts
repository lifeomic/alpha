
// whatwg-url does not accept non-numeric port values. Alpha uses the port
// value as the lambda qualifier. However, URL resolution can have tricky
// edge cases. We remove the lambda qualifier to allow whatwg-url to handle
// the URL resolution nuances and then reinsert the lambda qualifier (if
// present).
import { isAbsoluteURL, parseLambdaUrl } from './utils/url';
import { URL } from 'url';

export const resolve = (url: string, base: string) => {
  if (isAbsoluteURL(url)) {
    return url;
  }

  let lambdaParts = parseLambdaUrl(base);

  if (!lambdaParts) {
    const fakeHost = 'http://fake.fake';
    // This preserves the behavior we had under `url.resolve()` when
    // providing a path-only base
    if (base.startsWith('/')) {
      return new URL(url, `${fakeHost}${base}`).toString().replace(fakeHost, '');
    }

    return new URL(url, base).toString();
  }

  const qualifier = lambdaParts.qualifier ? `:${lambdaParts.qualifier}` : '';
  const sanitizedBase = `lambda://${lambdaParts.name}:0${lambdaParts.path}`;
  const resolved = new URL(url, sanitizedBase).toString();

  lambdaParts = parseLambdaUrl(resolved);
  return `lambda://${lambdaParts.name}${qualifier}${lambdaParts.path}`;
};
