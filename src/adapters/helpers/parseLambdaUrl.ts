import nearley from 'nearley';

const grammar = require('./lambdaURLGrammar');

export const parseLambdaUrl = (url: string) => {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  try {
    // large query strings can slow the parser down significantly
    const urlSplitOnQuery = url.split('?');
    parser.feed(urlSplitOnQuery.shift()!);
    const parts = parser.results;
    if (urlSplitOnQuery.length) {
      parts[0].path += `?${urlSplitOnQuery.join('?')}`;
    }
    return parts[0];
  } catch (error) {
    return null;
  }
};
