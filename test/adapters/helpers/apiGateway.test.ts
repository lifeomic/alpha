import test from 'ava';
import { ToProxyHeaders, toProxyHeaders } from '../../../src/adapters/helpers/apiGateway';
import { v4 as uuid } from 'uuid';
import { AxiosRequestHeaders } from 'axios';

test('will convert header values', (t) => {
  t.deepEqual(toProxyHeaders(), { multiValueHeaders: {}, headers: {} });
  const multiStringHeader = [uuid(), ` ${uuid()}`, `${uuid()} `, uuid()];
  const input: AxiosRequestHeaders = {
    stringHeader: uuid(),
    multiStringHeader: multiStringHeader.join(','),
    // @ts-ignore
    numberHeader: 123456,
    // @ts-ignore
    booleanHeader: true,
    // @ts-ignore
    undefinedHeader: undefined,
  };

  const expected: ToProxyHeaders = {
    headers: {
      stringHeader: input.stringHeader as string,
      multiStringHeader: multiStringHeader.join(','),
      numberHeader: `${input.numberHeader}`,
      booleanHeader: `${input.booleanHeader}`,
      undefinedHeader: undefined,
    },
    multiValueHeaders: {
      stringHeader: [input.stringHeader as string],
      multiStringHeader: multiStringHeader.map((v) => v.trim()),
      numberHeader: [`${input.numberHeader}`],
      booleanHeader: [`${input.booleanHeader}`],
      undefinedHeader: undefined,
    },
  };
  const actual = toProxyHeaders(input);
  t.deepEqual(actual, expected);
});
