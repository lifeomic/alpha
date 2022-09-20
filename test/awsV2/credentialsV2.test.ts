import { credentialsProvider } from '../../src/awsV2/credentialsV2';

import { GlobalConfigInstance } from 'aws-sdk/lib/config';
import { mock } from 'jest-mock-extended';
import { AWSError } from 'aws-sdk';

jest.mock('aws-sdk', () => ({
  get config() {
    return config;
  },
}));

const config = mock<GlobalConfigInstance>();

const error = mock<AWSError>();

test('will return empty credentials as default', async () => {
  config.getCredentials.mockImplementationOnce((cb) => {
    cb(error, null);
  });
  await expect(credentialsProvider()).resolves.toStrictEqual({
    accessKeyId: '',
    secretAccessKey: '',
  });
  config.getCredentials.mockImplementationOnce((cb) => {
    cb(null, null);
  });
  await expect(credentialsProvider()).resolves.toStrictEqual({
    accessKeyId: '',
    secretAccessKey: '',
  });
});
