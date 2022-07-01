import { Alpha } from '../src';
import nock from 'nock';
import { InvokeCommand, Lambda } from '@aws-sdk/client-lambda';
import { AxiosRequestConfig } from 'axios';
import { mockClient } from 'aws-sdk-client-mock';

const mockLambda = mockClient(Lambda);
const FakeLambda = jest.fn() as jest.MockedClass<typeof Lambda>;

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

beforeEach(() => {
  FakeLambda.mockReturnValue(new Lambda({}));
});

afterEach(() => {
  mockLambda.reset();
});

test('Lambda invocations should be retried after a timeout without a custom retryCondition', async () => {
  // Don't provide any response to invoke to mimic is not ever responding
  const alpha = new Alpha('lambda://test-function', {
    Lambda: FakeLambda,
  });

  mockLambda.on(InvokeCommand).callsFake(() => new Promise(() => {}));

  const request = alpha.get('/some/path', {
    timeout: 5,
    retry: {
      attempts: 2,
      factor: 1,
    },
  } as any as AxiosRequestConfig);

  await expect(request).rejects.toThrow();
  expect(mockLambda.commandCalls(InvokeCommand)).toHaveLength(3);
});
