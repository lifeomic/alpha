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

test.serial('Making a GET request with the lambda protocol with a qualifier invokes the lambda function using a qualifier', async (test) => {
  // Override the shared alpha client to include a qualifier
  test.context.alpha = new Alpha('lambda://test-function:2');

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
    Qualifier: '2',
    Payload: sinon.match.string
  }));

  const payload = JSON.parse(test.context.invoke.firstCall.args[0].Payload);

  test.is(payload.body, '');
  test.truthy(payload.headers);
  test.is(payload.httpMethod, 'GET');
  test.is(payload.path, '/some/path');
  test.deepEqual(payload.queryStringParameters, {});
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
