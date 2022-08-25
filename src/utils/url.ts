import nearley from 'nearley';
import grammar from './lambdaURLGrammar';

const WITH_SCHEME = /^[a-z][a-z\d+\-.]*:\/\//i;

export const isAbsoluteURL = (url: string) => WITH_SCHEME.test(url) || url.startsWith('//');

export const isLambdaUrl = (url: string) => !!url.match(/^lambda:\/\//);

export interface LambdaUrl {
  name: string;
  qualifier: string;
  path: string;
}

export const parseLambdaUrl = (url: string): LambdaUrl | null => {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  try {
    // large query strings can slow the parser down significantly
    const urlSplitOnQuery = url.split('?');
    parser.feed(urlSplitOnQuery.shift() as string);
    const parts = parser.results;
    if (urlSplitOnQuery.length) {
      parts[0].path = `${parts[0].path}?${urlSplitOnQuery.join('?')}`;
    }
    return parts[0];
  } catch (error) {
    return null;
  }
};
