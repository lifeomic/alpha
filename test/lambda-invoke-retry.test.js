const { Alpha } = require('../src');
const nock = require('nock');

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

test('Lambda invocations should be retried after a timeout without a custom retryCondition', async () => {
  // Don't provide any response to invoke to mimic is not ever responding
  const abort = jest.fn();
  let invokeCount = 0;
  const alpha = new Alpha('lambda://test-function', {
    Lambda: class UnresponsiveLambda {
      invoke () {
        invokeCount++;
        return {
          promise: () => new Promise(() => {}),
          send: () => {},
          abort,
        };
      }
    },
  });

  const request = alpha.get('/some/path', {
    timeout: 5,
    retry: {
      attempts: 2,
      factor: 1,
    },
  });

  await expect(request).rejects.toThrow();
  expect(invokeCount).toBe(3);
});
