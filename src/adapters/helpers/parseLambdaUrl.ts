import nearley, { CompiledRules } from 'nearley';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const grammar = require('./lambdaURLGrammar') as CompiledRules;

export const parseLambdaUrl = (url: string) => {
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
