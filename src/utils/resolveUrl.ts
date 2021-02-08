const resolvePathname = require('resolve-pathname');
import { URL } from 'url';

// whatwg-url does not accept non-numeric port values. Alpha uses the port
// value as the lambda qualifier. However, URL resolution can have tricky
// edge cases. We remove the lambda qualifier to allow whatwg-url to handle
// the URL resolution nuances and then reinsert the lambda qualifier (if
// present).
import { isAbsoluteURL } from '../adapters/helpers/isAbsoluteURL';
import { parseLambdaUrl } from './parseLambdaUrl';

export function resolveUrl (url: string | undefined, base: string | undefined) {
  if (url === undefined) {
    return base;
  }
  if (isAbsoluteURL(url) || base === undefined) {
    return url;
  }

  let lambdaParts = parseLambdaUrl(base);

  if (!lambdaParts) {
    // This preserves the behavior we had under `url.resolve()` when
    // providing a path-only base
    if (base.startsWith('/')) return resolvePathname(url, base);

    return new URL(url, base).toString();
  }

  const qualifier = lambdaParts.qualifier ? `:${lambdaParts.qualifier}` : '';
  const sanitizedBase = `lambda://${lambdaParts.name}:0${lambdaParts.path}`;
  const resolved = new URL(url, sanitizedBase).toString();

  lambdaParts = parseLambdaUrl(resolved);
  return `lambda://${lambdaParts.name}${qualifier}${lambdaParts.path}`;
}
