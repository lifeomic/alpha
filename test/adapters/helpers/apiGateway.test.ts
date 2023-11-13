import { ToProxyHeaders, toProxyHeaders } from '../../../src/adapters/helpers/apiGateway';
import { v4 as uuid } from 'uuid';
import { AxiosRequestHeaders, AxiosHeaders } from 'axios';

// TODO support the use case that request header value could be undefined/null
test('will convert header values', () => {
  expect(toProxyHeaders()).toEqual({ multiValueHeaders: {}, headers: {} });
  const multiStringHeader = [uuid(), ` ${uuid()}`, `${uuid()} `, uuid()];
  const input: AxiosRequestHeaders = new AxiosHeaders({
    stringHeader: uuid(),
    multiStringHeader: multiStringHeader.join(','),
    numberHeader: 123456,
    booleanHeader: true,
  });

  const expected: ToProxyHeaders = {
    headers: {
      stringHeader: input.stringHeader as string,
      multiStringHeader: multiStringHeader.join(','),
      numberHeader: `${input.numberHeader}`,
      booleanHeader: `${input.booleanHeader}`,
    },
    multiValueHeaders: {
      stringHeader: [input.stringHeader as string],
      multiStringHeader: multiStringHeader.map((v) => v.trim()),
      numberHeader: [`${input.numberHeader}`],
      booleanHeader: [`${input.booleanHeader}`],
    },
  };
  const actual = toProxyHeaders(input);
  expect(actual).toEqual(expected);
});
