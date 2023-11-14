import { ToProxyHeaders, toProxyHeaders } from '../../../src/adapters/helpers/apiGateway';
import { v4 as uuid } from 'uuid';
import { AxiosRequestHeaders } from 'axios';

// TODO support the use case that request header value could be undefined/null
test('will convert header values', () => {
  expect(toProxyHeaders()).toEqual({ multiValueHeaders: {}, headers: {} });
  const multiStringHeader = [uuid(), ` ${uuid()}`, `${uuid()} `, uuid()];
  // @ts-expect-error undefined is not allowed as header value, but it works
  const input: AxiosRequestHeaders = {
    stringHeader: uuid(),
    multiStringHeader: multiStringHeader.join(','),
    numberHeader: 123456,
    booleanHeader: true,
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
  expect(actual).toEqual(expected);
});
