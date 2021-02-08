const Alpha = require('../src/Alpha');
const nock = require('nock');
const sinon = require('sinon');
const test = require('ava');

test.before(() => {
  nock.disableNetConnect();
});

test.after(() => {
  nock.enableNetConnect();
});

test.serial('Lambda invocations should be retried after a timeout without a custom retryCondition', async (test) => {
  // Don't provide any response to invoke to mimic is not ever responding
  const abort = sinon.stub();
  let invokeCount = 0;
  const alpha = new Alpha('lambda://test-function', {
    Lambda: class UnresponsiveLambda {
      invoke () {
        invokeCount++;
        return {
          promise: function () { return new Promise(function () {}); },
          abort
        };
      }
    }
  });

  const request = alpha.get('/some/path', {
    timeout: 5,
    retry: {
      attempts: 2,
      factor: 1
    }
  });

  await test.throwsAsync(request);
  test.is(invokeCount, 3);
});
