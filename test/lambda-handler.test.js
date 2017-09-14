const Alpha = require('..');
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
  test.context.handler = sinon.stub();
  test.context.client = new Alpha(test.context.handler);
});

test('Making a GET request to a local handler invokes the handler', async (test) => {
  const response = {
    headers: { 'test-header': 'some value' },
    body: 'hello!',
    statusCode: 200
  };

  test.context.handler.callsArgWith(2, null, response);
  const result = await test.context.client.get('/some/path');

  test.is(result.status, 200);
  test.deepEqual(result.headers, response.headers);
  test.is(result.data, response.body);

  const event = {
    body: '',
    headers: sinon.match.object,
    httpMethod: 'GET',
    path: '/some/path',
    queryStringParameters: {}
  };

  const context = {};

  test.true(test.context.handler.calledWith(event, context, sinon.match.func));
});
