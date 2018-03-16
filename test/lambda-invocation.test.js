const Alpha = require('../src/Alpha');
const AWS = require('aws-sdk-mock');
const nock = require('nock');
const sinon = require('sinon');
const test = require('ava');

test.before(() => {
  nock.disableNetConnect();
});

test.after(() => {
  nock.enableNetConnect();
});

test.beforeEach((test) => {
  test.context.alpha = new Alpha('lambda://test-function');
  test.context.invoke = sinon.stub();
  AWS.mock('Lambda', 'invoke', test.context.invoke);
  test.context.abort = sinon.stub();
});

test.always.afterEach(() => {
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

  const response = await test.context.alpha.get('/some/path');

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
  test.deepEqual(payload.queryStringParameters, {});
});

async function testLambdaWithQualifier (test, qualifier) {
  // Override the shared alpha client to include a qualifier
  test.context.alpha = new Alpha(`lambda://test-function:${qualifier}`);

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

test.serial('When a lambda function returns an error code an error is thrown', async (test) => {
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: { error: 'Bad request.' },
      headers: {},
      statusCode: 400
    })
  });

  const error = await test.throws(test.context.alpha.get('/some/path'));

  test.is(error.message, 'Request failed with status code 400');
  test.truthy(error.config);
  test.is(error.config.url, 'lambda://test-function/some/path');

  test.is(error.response.status, 400);
  test.deepEqual(error.response.headers, {});
  test.deepEqual(error.response.data, { error: 'Bad request.' });

  test.is(error.request.FunctionName, 'test-function');
  test.is(error.request.InvocationType, 'RequestResponse');
  test.true(error.request.Payload.length > 0);

  const payload = JSON.parse(error.request.Payload);

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

  const response = await test.context.alpha.get('/some/path', { validateStatus: false });

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

  const error = await test.throws(test.context.alpha.get('/some/path'));

  test.is(error.message, errorMessage);
  test.truthy(error.config);
  test.is(error.config.url, 'lambda://test-function/some/path');

  test.is(error.request.FunctionName, 'test-function');
  test.is(error.request.InvocationType, 'RequestResponse');
  test.true(error.request.Payload.length > 0);

  const payload = JSON.parse(error.request.Payload);

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

function delayedLambda (test, delay, errorToThrow) {
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

test.serial('A timeout can be configured for the invoked lambda function', async (test) => {
  const error = await test.throws(test.context.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1000), // lambda will take 1000 ms
    timeout: 5 // timeout at 5 ms
  }));

  test.is(error.code, 'ECONNABORTED');
  test.is(test.context.abort.callCount, 1);
});

test.serial.cb('A configured timeout does not hinder normal lambda function invocation behavior', (test) => {
  test.context.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1),
    timeout: 10
  }).then(response => {
    test.is(response.data, 'hello!');
    test.is(response.status, 200);
    test.deepEqual(response.headers, { 'test-header': 'some value' });

    // By ending the test 10ms after the timeout, we ensure that the internal setTimeout firing doesn't
    // cause any negative side effects, such as attempting to abort after the lambda finished.
    setTimeout(() => {
      test.is(test.context.abort.callCount, 0);
      test.end();
    }, 20);
  });
});

test.serial('A configured timeout does not eat lambda function invocation errors', async (test, done) => {
  const error = await test.throws(test.context.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1, new Error('Other error')),
    timeout: 1000
  }));

  test.is(error.message, 'Other error');
  test.is(test.context.abort.callCount, 0);
});
