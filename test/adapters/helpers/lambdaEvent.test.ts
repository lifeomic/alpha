import { querystringWithArraySupport } from '../../../src/adapters/helpers/lambdaEvent';
import { v4 as uuid } from 'uuid';
import * as queryString from 'querystring';

test('will extract the query string', () => {
  const query = {
    [uuid()]: uuid(),
    [uuid()]: uuid(),
    [uuid()]: uuid(),
  };
  const asString = queryString.stringify(query);
  expect(querystringWithArraySupport(asString)).toEqual(query);
  expect(querystringWithArraySupport(`?${asString}`)).toEqual(query);
});
