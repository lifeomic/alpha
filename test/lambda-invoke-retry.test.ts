import nock from 'nock';
import sinon from 'sinon';
import test from 'ava';

import configureAxios from '../src';
import {AxiosRequestConfig} from 'axios';

test.before(() => {
  nock.disableNetConnect();
});

test.after(() => {
  nock.enableNetConnect();
});

function sleep (timeout: number) {
  return new Promise(resolve => setTimeout(() => resolve(), timeout));
}


test.serial('AlphaLambda invocations should be retried after a timeout without a custom retryCondition', async (test) => {
  // Don't provide any response to invoke to mimic is not ever responding
  const abort = sinon.stub();
  const promise = sinon.stub();
  promise.onFirstCall().callsFake(() => sleep(100));
  promise.onSecondCall().callsFake(() => sleep(100));
  promise.onThirdCall().resolves({ Payload: '{}' });

  class OneSecondAWSLambda {
    invoke () {
      invokeCount++;
      return {
        abort,
        promise
      };
    }
  }
  let invokeCount = 0;
  // @ts-ignore
  const alpha = configureAxios({url: 'lambda://test-function', config: {Lambda: OneSecondAWSLambda}});

  const request = alpha.get('/some/path', {
    timeout: 5,
    retry: {
      attempts: 2,
      factor: 1
    }
  } as AxiosRequestConfig);

  await test.throwsAsync(() => request);
  test.is(invokeCount, 3);
  sinon.assert.calledThrice(promise);
});
