const Alpha = require('..');
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

  const alpha = new Alpha('lambda://test-function');
  const response = await alpha.get('/some/path');

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

test.serial('When a lambda function returns an error code an error is thrown', async (test) => {
  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: { error: 'Bad request.' },
      headers: {},
      statusCode: 400
    })
  });

  const alpha = new Alpha('lambda://test-function');
  const error = await test.throws(alpha.get('/some/path'));

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
