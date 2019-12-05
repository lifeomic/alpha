import anyTest, {ExecutionContext, TestInterface} from 'ava';
import AWS_SDK from 'aws-sdk';
import AWS from 'aws-sdk-mock';
import {AxiosInstance, AxiosRequestConfig} from 'axios';
import nock from 'nock';
import sinon from 'sinon';

import configureAxios from '../src/index';
import {LambdaHttpEvent, LambdaResponse} from '../src/types';
import RequestError from '../src/utils/RequestError';
import {resolveUrl} from '../src/utils/urlUtils';

interface TestContext {
  alpha: AxiosInstance;
  invoke: sinon.SinonStub;
  abort: sinon.SinonStub;
}

const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  nock.disableNetConnect();
});

test.after(() => {
  nock.enableNetConnect();
});

test.beforeEach((test) => {
  test.context.alpha = configureAxios({url: 'lambda://test-function'});
  test.context.invoke = sinon.stub();
  AWS.mock('Lambda', 'invoke', test.context.invoke);
  test.context.abort = sinon.stub();
});

test.afterEach.always(() => {
  AWS.restore();
});

test.serial('Making a GET request with the lambda protocol invokes the lambda function', async (test) => {
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200
    })
  });

  const response = await test.context.alpha.get(
    '/some/path?param1=value1',
    { params: { param2: 'value2' } });

  test.is(response.data, 'hello!');
  test.is(response.status, 200);
  test.deepEqual(response.headers, { 'test-header': 'some value' });

  test.true(test.context.invoke.calledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: sinon.match.string
  }));

  const payload = JSON.parse(test.context.invoke.firstCall.args[0].Payload);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, { param1: 'value1', param2: 'value2' });
});

async function assertInvalidUrl (test: ExecutionContext<TestContext>, url: string) {
  // Override the shared alpha client to include a qualifier
  const path = '/some/path';
  test.context.alpha = configureAxios({url});
  const expectedUrl = resolveUrl(path, url);
  await test.throwsAsync(test.context.alpha.get(path), `The config.url, '${expectedUrl}' does not appear to be a Lambda Function URL`);
}

test('Invalid URLs cause errors to be thrown', async (test) => {
  await assertInvalidUrl(test, 'lambda://test-function.test');
  await assertInvalidUrl(test, 'lambda://test-function.test/test');
  await assertInvalidUrl(test, 'lambda://test-function.test:2345');
});

async function assertBadUrl (test: ExecutionContext<TestContext>, url: string) {
  // Override the shared alpha client to include a qualifier
  const path = '/some/path';
  test.context.alpha = configureAxios({url});
  await test.throwsAsync(test.context.alpha.get(path), `Invalid URL: ${url}`);
}

test('Bad urls cause errors to be thrown', async (test) => {
  await assertBadUrl(test, 'lambda://test-function.test:2345:another');
  await assertBadUrl(test, 'lambda://test-function.test:2345:another/test');
});

async function testLambdaWithQualifier (test: ExecutionContext<TestContext>, qualifier: string) {
  // Override the shared alpha client to include a qualifier
  test.context.alpha = configureAxios({url:`lambda://test-function:${qualifier}`});

  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200
    })
  });

  const response = await test.context.alpha.get('/some/path');

  test.is(response.data, 'hello!');
  test.is(response.status, 200);
  test.deepEqual(response.headers, { 'test-header': 'some value' });

  sinon.assert.calledWithMatch(test.context.invoke, {
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Qualifier: qualifier,
    Payload: sinon.match.string
  }, sinon.match.func);

  const payload = JSON.parse(test.context.invoke.firstCall.args[0].Payload);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});
}

test.serial('Making a GET request with the lambda protocol with a numeric qualifier invokes the lambda function using a qualifier', async (test) => {
  await testLambdaWithQualifier(test, '2');
});

test.serial('Making a GET request with the lambda protocol with a non-numeric qualifier invokes the lambda function using a qualifier', async (test) => {
  await testLambdaWithQualifier(test, 'deployed');
});

test.serial('Making a GET request with the lambda protocol with an explicit $LATEST qualifier invokes the lambda function using a qualifier', async (test) => {
  await testLambdaWithQualifier(test, '$LATEST');
});

test.serial('When a lambda function returns an error code an error is thrown', async (test) => {
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: { error: 'Bad request.' },
      headers: {},
      statusCode: 400
    })
  });

  const error = await test.throwsAsync<RequestError<AWS_SDK.Lambda.InvocationRequest, LambdaResponse>>(() => test.context.alpha.get('/some/path'));

  test.is(error.message, 'Request failed with status code 400');
  test.truthy(error.config);
  test.is(error.config.url, '/some/path');
  test.is(error.config.baseURL, 'lambda://test-function');

  test.is(error.response!.status, 400);
  test.deepEqual(error.response!.headers, {});
  test.deepEqual(error.response!.data, { error: 'Bad request.' });

  test.is(error.request.FunctionName, 'test-function');
  test.is(error.request.InvocationType, 'RequestResponse');
  test.true((error.request.Payload! as string).length > 0);

  const payload = JSON.parse(error.request.Payload! as string);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});

  test.false(Object.keys(error).includes('code'));
  test.true(test.context.invoke.called);
});

test.serial('When status validation is disabled errors are not thrown', async (test) => {
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'error!',
      statusCode: 400
    })
  });

  const response = await test.context.alpha.get('/some/path', { validateStatus: () => true });

  test.is(response.status, 400);
  test.is(response.data, 'error!');
});

test.serial('When a lambda function returns an Unhandled FunctionError an error is thrown', async (test) => {
  const errorMessage = 'A failure';
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    FunctionError: 'Unhandled',
    Payload: JSON.stringify({ errorMessage })
  });

  const error = await test.throwsAsync<RequestError<AWS_SDK.Lambda.InvocationRequest>>(() => test.context.alpha.get('/some/path'));

  test.is(error.message, errorMessage);
  test.truthy(error.config);
  test.is(error.config.url, '/some/path');
  test.is(error.config.baseURL, 'lambda://test-function');

  test.is(error.request.FunctionName, 'test-function');
  test.is(error.request.InvocationType, 'RequestResponse');
  test.true((error.request.Payload! as string).length > 0);

  const payload = JSON.parse(error.request.Payload! as string);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});

  test.false(Object.keys(error).includes('code'));
  test.true(test.context.invoke.called);
});

test.serial('When a lambda function returns a Handled FunctionError an error is thrown', async (test) => {
  const errorMessage = 'A failure';
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    FunctionError: 'Handled',
    Payload: JSON.stringify({ errorMessage })
  });

  const error = await test.throwsAsync<RequestError<AWS_SDK.Lambda.InvocationRequest, unknown>>(() => test.context.alpha.get('/some/path'));

  test.is(error.message, errorMessage);
  test.truthy(error.config);
  test.is(error.config.url, '/some/path');
  test.is(error.config.baseURL, 'lambda://test-function');

  test.is(error.request.FunctionName, 'test-function');
  test.is(error.request.InvocationType, 'RequestResponse');
  test.true((error.request.Payload! as string).length > 0);

  const payload = JSON.parse(error.request.Payload! as string);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});

  test.false(Object.keys(error).includes('code'));
  test.true(test.context.invoke.called);
});

test.serial('When the Payload attribute is null an error is thrown', async (test) => {
  const response = {
    StatusCode: 500,
    Payload: null
  };
  test.context.invoke.callsArgWith(1, null, response);

  const error = await test.throwsAsync<RequestError<AWS_SDK.Lambda.InvocationRequest, unknown>>(() => test.context.alpha.get('/some/path'));

  test.is(error.message, `Unexpected Payload shape from lambda://test-function/some/path. The full response was\n${JSON.stringify(response, null, '  ')}`);

  test.truthy(error.config);
  test.is(error.config.url, '/some/path');
  test.is(error.config.baseURL, 'lambda://test-function');

  test.is(error.request.FunctionName, 'test-function');
  test.is(error.request.InvocationType, 'RequestResponse');
  test.true((error.request.Payload! as string).length > 0);

  const payload: LambdaHttpEvent = JSON.parse(error.request.Payload! as string);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});

  test.false(Object.keys(error).includes('code'));
  test.true(test.context.invoke.called);
});

test.serial('Redirects are automatically followed (301)', async (test) => {
  test.context.invoke.onFirstCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/redirect' },
      statusCode: 301
    })
  });

  test.context.invoke.onSecondCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200
    })
  });

  const response = await test.context.alpha.get('/some/path');

  test.is(response.status, 200);
  test.is(response.data, 'we made it alive!');

  test.true(test.context.invoke.firstCall.calledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: sinon.match.string
  }));

  let payload = JSON.parse(test.context.invoke.firstCall.args[0].Payload);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});

  test.true(test.context.invoke.secondCall.calledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: sinon.match.string
  }));

  payload = JSON.parse(test.context.invoke.secondCall.args[0].Payload);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/redirect');
  test.deepEqual(payload.queryStringParameters, {});
});

test.serial('Redirects are automatically followed (302)', async (test) => {
  test.context.invoke.onFirstCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/redirect' },
      statusCode: 302
    })
  });

  test.context.invoke.onSecondCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200
    })
  });

  const response = await test.context.alpha.get('/some/path');

  test.is(response.status, 200);
  test.is(response.data, 'we made it alive!');

  test.true(test.context.invoke.firstCall.calledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: sinon.match.string
  }));

  let payload = JSON.parse(test.context.invoke.firstCall.args[0].Payload);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});

  test.true(test.context.invoke.secondCall.calledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: sinon.match.string
  }));

  payload = JSON.parse(test.context.invoke.secondCall.args[0].Payload);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/redirect');
  test.deepEqual(payload.queryStringParameters, {});
});

test.serial('Binary content is base64 encoded', async (test) => {
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({ statusCode: 200 })
  });

  const content = Buffer.from('hello!');
  const response = await test.context.alpha.put('/some/path', content);

  test.is(response.status, 200);

  sinon.assert.calledWithExactly(
    test.context.invoke,
    {
      FunctionName: 'test-function',
      InvocationType: 'RequestResponse',
      Payload: sinon.match.string
    },
    sinon.match.func
  );

  const payload = JSON.parse(test.context.invoke.firstCall.args[0].Payload);

  test.is(payload.body, content.toString('base64'));
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'PUT');
  test.true(payload.isBase64Encoded);
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});
});

function delayedLambda (test: ExecutionContext<TestContext>, delay: number, errorToThrow?: Error) {
  return class OneSecondAWSLambda {
    invoke () {
      return {
        abort: test.context.abort,
        promise: async () => {
          return new Promise((resolve, reject) => {
            if (errorToThrow) {
              return reject(errorToThrow);
            }
            setTimeout(() => {
              resolve({
                StatusCode: 200,
                Payload: JSON.stringify({
                  body: 'hello!',
                  headers: { 'test-header': 'some value' },
                  statusCode: 200
                })
              });
            }, delay);
          });
        }
      };
    }
  };
}

test.serial('timeout values are provided to the HTTP client used by the AlphaLambda client', async (test) => {
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200
    })
  });

  await test.context.alpha.get('/some/path', { timeout: 5 });

  sinon.assert.calledOnce((AWS_SDK.Lambda as unknown) as sinon.SinonStub);
  sinon.assert.calledWithMatch((AWS_SDK.Lambda as unknown) as sinon.SinonStub, {
    httpOptions: {
      connectTimeout: 5,
      timeout: 5
    }
  });
});

test.serial('A timeout can be configured for the invoked lambda function', async (test) => {
  const error = await test.throwsAsync<RequestError>(() => test.context.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1000), // lambda will take 1000 ms
    timeout: 5 // timeout at 5 ms
  } as AxiosRequestConfig));

  test.is(error.code, 'ECONNABORTED');
  sinon.assert.calledOnce(test.context.abort);
});

test.serial('A configured timeout does not hinder normal lambda function invocation behavior', async (test) => {
  await test.context.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1),
    timeout: 10
  } as AxiosRequestConfig).then(response => {
    test.is(response.data, 'hello!');
    test.is(response.status, 200);
    test.deepEqual(response.headers, { 'test-header': 'some value' });
  });
  sinon.assert.notCalled(test.context.abort);
});

test.serial('A configured timeout does not eat lambda function invocation errors', async (test) => {
  const clock = sinon.useFakeTimers();
  try {
    const error = await test.throwsAsync(() => test.context.alpha.get('/some/path', {
      Lambda: delayedLambda(test, 1, new Error('Other error')),
      timeout: 1000
    } as AxiosRequestConfig));

    test.is(error.message, 'Other error');
    sinon.assert.notCalled(test.context.abort);

    test.is(clock.countTimers(), 0);
  } finally {
    clock.restore();
  }
});

test.serial('lambda function invocation errors are re-thrown', async (test) => {
  const error = await test.throwsAsync(() => test.context.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1, new Error('Other error'))
  } as AxiosRequestConfig));

  test.is(error.message, 'Other error');
});