const { configureAxios } = require('../src');
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
  test.context.client = configureAxios({ target: test.context.handler });
});

test('works with a callback style handler that executes the callback async', async (test) => {
  const response = {
    headers: { 'test-header': 'some value' },
    body: 'hello!',
    statusCode: 200
  };

  test.context.handler.callsArgWithAsync(2, null, response);
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

  sinon.assert.calledWithExactly(
    test.context.handler,
    event,
    context,
    sinon.match.func
  );
});

function setupHandlerBehavior ({ handlerStub, isCallbackStyleHandler, error, response }) {
  if (isCallbackStyleHandler) {
    handlerStub.callsArgWith(2, error, response);
  } else {
    error ? handlerStub.rejects(error) : handlerStub.resolves(response);
  }
}

function registerSpecs (isCallbackStyleHandler) {
  test(`Making a GET request to a local handler invokes the handler (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
    const response = {
      headers: { 'test-header': 'some value' },
      body: 'hello!',
      statusCode: 200
    };

    setupHandlerBehavior({
      handlerStub: test.context.handler,
      isCallbackStyleHandler,
      response
    });
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

    sinon.assert.calledWithExactly(
      test.context.handler,
      event,
      context,
      sinon.match.func
    );
  });

  test(`When a local handler returns an error the request fails (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
    const failure = new Error('simulated failure');
    setupHandlerBehavior({
      handlerStub: test.context.handler,
      error: failure,
      isCallbackStyleHandler
    });

    const error = await test.throwsAsync(test.context.client.get('/some/path'));

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

  test(`When status validation is disable errors are not thrown (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
    const response = {
      body: 'error!',
      statusCode: 400
    };

    setupHandlerBehavior({
      handlerStub: test.context.handler,
      response,
      isCallbackStyleHandler
    });

    const result = await test.context.client.get('/some/path', { validateStatus: false });

    test.is(result.status, response.statusCode);
    test.is(result.data, response.body);
  });

  test.only(`Redirects are automatically followed (301) (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
    const redirect = {
      headers: { location: '/other/path' },
      statusCode: 301
    };

    const response = {
      body: 'hello!',
      statusCode: 200
    };

    setupHandlerBehavior({
      handlerStub: test.context.handler.onFirstCall(),
      response: redirect,
      isCallbackStyleHandler
    });
    setupHandlerBehavior({
      handlerStub: test.context.handler.onSecondCall(),
      response,
      isCallbackStyleHandler
    });

    const result = await test.context.client.get('/some/path');

    test.is(result.status, 200);
    test.is(result.data, response.body);

    sinon.assert.calledWithExactly(
      test.context.handler.firstCall,
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
    sinon.assert.calledWithExactly(
      test.context.handler.secondCall,
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

  test(`Redirects are automatically followed (302) (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
    const redirect = {
      headers: { location: '/other/path' },
      statusCode: 302
    };

    const response = {
      body: 'hello!',
      statusCode: 200
    };

    setupHandlerBehavior({
      handlerStub: test.context.handler.onFirstCall(),
      response: redirect,
      isCallbackStyleHandler
    });
    setupHandlerBehavior({
      handlerStub: test.context.handler.onSecondCall(),
      response,
      isCallbackStyleHandler
    });

    const result = await test.context.client.get('/some/path');

    test.is(result.status, 200);
    test.is(result.data, response.body);

    sinon.assert.calledWithExactly(
      test.context.handler.firstCall,
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
    sinon.assert.calledWithExactly(
      test.context.handler.secondCall,
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

  test(`Binary content is base64 encoded (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
    const content = Buffer.from('hello!');

    const response = {
      statusCode: 204
    };

    setupHandlerBehavior({
      handlerStub: test.context.handler,
      response,
      isCallbackStyleHandler
    });
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

    sinon.assert.calledWithExactly(
      test.context.handler,
      event,
      {},
      sinon.match.func
    );
  });
}
registerSpecs(true);
// registerSpecs(false);
