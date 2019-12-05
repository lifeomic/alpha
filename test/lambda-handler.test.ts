import anyTest, {TestInterface} from 'ava';
import {AxiosInstance} from 'axios';
import nock from 'nock';
import sinon from 'sinon';

import configureAxios from '../src/index';
import RequestError from '../src/utils/RequestError';
import {LambdaRequestPayload} from '../src/types';

interface TestContext {
  handler: sinon.SinonStub;
  client: AxiosInstance;
}

const test = anyTest as TestInterface<TestContext>;

test.before(() => {
  nock.disableNetConnect();
});

test.after(() => {
  nock.enableNetConnect();
});

test.beforeEach((test) => {
  test.context.handler = sinon.stub();
  test.context.client = configureAxios({target: test.context.handler});
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

test('When a local handler returns an error the request fails', async (test) => {
  const failure = new Error('simulated failure');
  test.context.handler.callsArgWith(2, failure);

  const error = await test.throwsAsync<RequestError<LambdaRequestPayload>>(() => test.context.client.get('/some/path'), RequestError);

  test.is(error.message, failure.message);

  test.truthy(error.config);
  test.is(error.config.url, '/some/path');

  test.is(error.response, undefined);

  test.truthy(error.request);
  test.is(error.request.event.body, '');
  test.truthy(error.request.event.headers);
  test.is(error.request.event.httpMethod, 'GET');
  test.is(error.request.event.path, '/some/path');
  test.deepEqual(error.request.event.queryStringParameters, {});

  test.false(Object.keys(error).includes('code'));
  test.true(test.context.handler.called);
});

test('When status validation is disabled, errors are not thrown', async (test) => {
  const response = {
    body: 'error!',
    statusCode: 400
  };

  test.context.handler.callsArgWith(2, null, response);
  const result = await test.context.client.get('/some/path', { validateStatus: () => true });

  test.is(result.status, response.statusCode);
  test.is(result.data, response.body);
});

test('Redirects are automatically followed (301)', async (test) => {
  const redirect = {
    headers: { location: '/other/path' },
    statusCode: 301
  };

  const response = {
    body: 'hello!',
    statusCode: 200
  };

  test.context.handler.onFirstCall().callsArgWith(2, null, redirect);
  test.context.handler.onSecondCall().callsArgWith(2, null, response);

  const result = await test.context.client.get('/some/path');

  test.is(result.status, 200);
  test.is(result.data, response.body);

  sinon.assert.calledWithExactly(test.context.handler.firstCall,
    {
      body: '',
      headers: sinon.match.object,
      httpMethod: 'GET',
      path: '/some/path',
      queryStringParameters: {}
    },
    {},
    sinon.match.func
  );

  sinon.assert.calledWithExactly(test.context.handler.secondCall,
    {
      body: '',
      headers: sinon.match.object,
      httpMethod: 'GET',
      path: '/other/path',
      queryStringParameters: {}
    },
    {},
    sinon.match.func
  );
});

test('Redirects are automatically followed (302)', async (test) => {
  const redirect = {
    headers: { location: '/other/path' },
    statusCode: 302
  };

  const response = {
    body: 'hello!',
    statusCode: 200
  };

  test.context.handler.onFirstCall().callsArgWith(2, null, redirect);
  test.context.handler.onSecondCall().callsArgWith(2, null, response);

  const result = await test.context.client.get('/some/path');

  test.is(result.status, 200);
  test.is(result.data, response.body);

  sinon.assert.calledWithExactly(test.context.handler.firstCall,
    {
      body: '',
      headers: sinon.match.object,
      httpMethod: 'GET',
      path: '/some/path',
      queryStringParameters: {}
    },
    {},
    sinon.match.func
  );

  sinon.assert.calledWithExactly(test.context.handler.secondCall,
    {
      body: '',
      headers: sinon.match.object,
      httpMethod: 'GET',
      path: '/other/path',
      queryStringParameters: {}
    },
    {},
    sinon.match.func
  );
});

test('Binary content is base64 encoded', async (test) => {
  const content = Buffer.from('hello!');

  const response = {
    statusCode: 204
  };

  test.context.handler.callsArgWith(2, null, response);
  const result = await test.context.client.put('/some/path', content);

  test.is(result.status, 204);

  const event = {
    body: content.toString('base64'),
    headers: sinon.match.object,
    httpMethod: 'PUT',
    isBase64Encoded: true,
    path: '/some/path',
    queryStringParameters: {}
  };

  sinon.assert.calledWithExactly(test.context.handler, event, {}, sinon.match.func);
});
