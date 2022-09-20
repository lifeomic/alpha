import { Alpha } from '../src';

const moduleExists = jest.fn();
const awsLambdaSdkV2 = 'aws-sdk/clients/lambda';
const awsLambdaSdkV3 = '@aws-sdk/client-lambda';

jest.mock('../src/utils/modules', () => ({
  get moduleExists() {
    return moduleExists;
  },
}));

test('will throw error if no aws sdk found', async () => {
  const alpha = new Alpha('lambda://test-function', { adapter: undefined });
  await expect(alpha.get('/any')).rejects.toThrowError(`Missing module ${awsLambdaSdkV2} or ${awsLambdaSdkV3}`);
});
