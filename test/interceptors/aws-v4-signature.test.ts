import { AxiosHeaders } from 'axios';
import { Handler } from 'aws-lambda';
import { Credentials } from '@aws-sdk/types';

import { Alpha, AlphaOptions } from '../../src';

const handler: jest.MockedFn<Handler> = jest.fn();

const host = 'lambda:deployed';
const path = '/some/path';

const defaultOptions = { headers: new AxiosHeaders() };
const alpha = new Alpha(handler, { baseURL: `lambda://${host}`, ...defaultOptions });

const response = {
  headers: { 'test-header': 'some value' },
  body: 'hello!',
  statusCode: 200,
};

const expectedResponse = {
  data: response.body,
  status: response.statusCode,
  statusText: 'OK',
  headers: response.headers,
};

const credentials: Credentials = {
  accessKeyId: 'foo',
  secretAccessKey: 'bar',
};

beforeEach(() => {
  handler.mockResolvedValue(response);
  process.env.AWS_ACCESS_KEY_ID = 'foo';
  process.env.AWS_SECRET_ACCESS_KEY = 'bar';
});

const matchingObj = expect.objectContaining({
  headers: expect.objectContaining({
    authorization: expect.stringMatching(/AWS4-HMAC-SHA256 Credential=foo\/[0-9]{8}\/us-east-1\/\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[a-f0-9]{64}/),
    'x-amz-content-sha256': expect.any(String),
    'x-amz-date': expect.any(String),
  }),
});

test.each<AlphaOptions | undefined>([
  undefined,
  { signAwsV4: { credentials }, ...defaultOptions },
  { headers: new AxiosHeaders({ host }) },
  { headers: new AxiosHeaders({ Host: host }) },
])('%# will add v4 signature to requests', async (
  {
    signAwsV4 = {},
    ...options
  } = defaultOptions,
) => {
  await expect(alpha.get(path, { signAwsV4, ...options })).resolves
    .toEqual(expect.objectContaining(expectedResponse));

  expect(handler).toHaveBeenCalledWith(matchingObj, expect.any(Object), expect.any(Function));
});

test('will get port', async () => {
  const alpha = new Alpha(handler, { baseURL: 'https://www.lifeomic.com:80', ...defaultOptions });
  await expect(alpha.get(path, { signAwsV4: {}, ...defaultOptions })).resolves
    .toEqual(expect.objectContaining(expectedResponse));

  expect(handler).toHaveBeenCalledWith(matchingObj, expect.any(Object), expect.any(Function));
});

test('will not sign requests without config', async () => {
  const alpha = new Alpha(handler);
  await expect(alpha.get(path)).resolves
    .toEqual(expect.objectContaining(expectedResponse));

  expect(handler).not.toHaveBeenCalledWith(matchingObj, expect.any(Object), expect.any(Function));
});
