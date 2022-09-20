import { Handler } from 'aws-lambda';
import { Credentials } from '@aws-sdk/types';

import { Alpha, AlphaOptions } from '../../src';
import * as rawModules from '../../src/utils/modules';
import { MockProxy } from 'jest-mock-extended';

jest.mock('../../src/utils/modules');

const handler: jest.MockedFn<Handler> = jest.fn();

const host = 'lambda:deployed';
const path = '/some/path';

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

describe.each<2|3>([
  2,
  3,
])('aws-sdk v%d', (awsSdkVersion) => {
  const alpha = new Alpha(handler, { baseURL: `lambda://${host}`, awsSdkVersion });

  test.each<AlphaOptions | undefined>([
    undefined,
    { signAwsV4: { credentials } },
    { headers: { host } },
    { headers: { Host: host } },
  ])('%# will add v4 signature to requests', async (
    {
      signAwsV4 = {},
      ...options
    } = {},
  ) => {
    await expect(alpha.get(path, { signAwsV4, ...options })).resolves
      .toEqual(expect.objectContaining(expectedResponse));

    expect(handler).toBeCalledWith(matchingObj, expect.any(Object), expect.any(Function));
  });

  test('will get port', async () => {
    const alpha = new Alpha(handler, { baseURL: 'https://www.lifeomic.com:80', awsSdkVersion });
    await expect(alpha.get(path, { signAwsV4: {} })).resolves
      .toEqual(expect.objectContaining(expectedResponse));

    expect(handler).toBeCalledWith(matchingObj, expect.any(Object), expect.any(Function));
  });

  test('will not sign requests without config', async () => {
    const alpha = new Alpha(handler, { awsSdkVersion });
    await expect(alpha.get(path)).resolves
      .toEqual(expect.objectContaining(expectedResponse));

    expect(handler).not.toBeCalledWith(matchingObj, expect.any(Object), expect.any(Function));
  });
});

describe('mocked moduleExists', () => {
  const alpha = new Alpha(handler, { baseURL: `lambda://${host}`, signAwsV4: {} });

  const awsCredentialsProviderV3 = '@aws-sdk/credential-provider-node';
  const awsCredentialsProviderV2 = 'aws-sdk/lib/config';

  test('will throw if no module found', async () => {
    const { moduleExists } = rawModules as MockProxy<typeof rawModules>;
    moduleExists.mockResolvedValue(false);
    await expect(alpha.get(path)).rejects.toThrowError();

    expect(handler).not.toBeCalled();
    expect(moduleExists).toHaveBeenCalledWith(awsCredentialsProviderV3);
    expect(moduleExists).toHaveBeenCalledWith(awsCredentialsProviderV2);
  });

  test('will make calls to the right aws sdk', async () => {
    const { moduleExists } = rawModules as MockProxy<typeof rawModules>;
    moduleExists.mockResolvedValueOnce(true);
    await expect(alpha.get(path)).resolves
      .toEqual(expect.objectContaining(expectedResponse));

    expect(moduleExists).toHaveBeenCalledWith(awsCredentialsProviderV3);
    expect(moduleExists).not.toHaveBeenCalledWith(awsCredentialsProviderV2);

    moduleExists.mockReset();
    moduleExists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(alpha.get(path)).resolves
      .toEqual(expect.objectContaining(expectedResponse));

    expect(moduleExists).toHaveBeenCalledWith(awsCredentialsProviderV3);
    expect(moduleExists).toHaveBeenCalledWith(awsCredentialsProviderV2);
  });
});
