const Alpha = require('../src/Alpha');
const nock = require('nock');
const sinon = require('sinon');
const test = require('ava');

const response = {
  headers: { 'test-header': 'some value' },
  body: 'hello!',
  statusCode: 200
};

const event = {
  body: '',
  headers: sinon.match.object,
  httpMethod: 'GET',
  path: '/some/path',
  queryStringParameters: {},
  multiValueHeaders: sinon.match.object,
  requestContext: {
    requestId: sinon.match.string
  }
};

const contextKeys = [
  'awsRequestId',
  'callbackWaitsForEmptyEventLoop',
  'functionName',
  'functionVersion',
  'invokedFunctionArn',
  'memoryLimitInMB',
  'logGroupName',
  'logStreamName',
  'getRemainingTimeInMillis',
  'done',
  'fail',
  'succeed'
];

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

const setupHandler = (t, expectedEvent, response, useCallback = false) => {
  t.context.handler.callsFake((event, context, cb) => {
    sinon.assert.match(cb, sinon.match.func);
    sinon.assert.match(event, sinon.match(event));
    sinon.assert.match(Object.keys(context), sinon.match.array.contains(contextKeys));
    t.is(context.getRemainingTimeInMillis(), 0);
    t.is(context.done(), undefined);
    t.is(context.fail(), undefined);
    t.is(context.succeed(), undefined);
    t.regex(context.awsRequestId, /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/);
    if (useCallback) {
      cb(undefined, response);
    } else {
      return Promise.resolve(response);
    }
  });
};

test('provides a mock context', async (test) => {
  setupHandler(test, event, response);
  const result = await test.context.client.get('/some/path');

  test.is(result.status, 200);
  test.deepEqual(result.headers, response.headers);
  test.is(result.data, response.body);
});

test('works with a callback style handler that executes the callback async', async (test) => {
  setupHandler(test, event, response, true);
  const result = await test.context.client.get('/some/path');

  test.is(result.status, 200);
  test.deepEqual(result.headers, response.headers);
  test.is(result.data, response.body);
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
    setupHandlerBehavior({
      handlerStub: test.context.handler,
      isCallbackStyleHandler,
      response
    });
    const result = await test.context.client.get('/some/path');

    test.is(result.status, 200);
    test.deepEqual(result.headers, response.headers);
    test.is(result.data, response.body);

    sinon.assert.calledWithExactly(
      test.context.handler,
      sinon.match(event),
      sinon.match.object,
      sinon.match.func
    );
  });

  test(`Making a POST request to a local handler invokes the handler (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
    setupHandlerBehavior({
      handlerStub: test.context.handler,
      isCallbackStyleHandler,
      response
    });
    const result = await test.context.client.post('/some/path', { data: 'test' }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    test.is(result.status, 200);
    test.deepEqual(result.headers, response.headers);
    test.is(result.data, response.body);

    const event = {
      body: JSON.stringify({ data: 'test' }),
      headers: sinon.match.object,
      httpMethod: 'POST',
      path: '/some/path',
      queryStringParameters: {},
      requestContext: {
        requestId: sinon.match.string
      },
      multiValueHeaders: sinon.match.object
    };

    sinon.assert.calledWithExactly(
      test.context.handler,
      sinon.match(event),
      sinon.match.object,
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

  test(`Redirects are automaticaly followed (301) (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
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
      sinon.match({
        body: '',
        headers: sinon.match.object,
        httpMethod: 'GET',
        path: '/some/path',
        queryStringParameters: {},
        multiValueHeaders: sinon.match.object,
        requestContext: {
          requestId: sinon.match.string
        }
      }),
      sinon.match.object,
      sinon.match.func
    );
    sinon.assert.calledWithExactly(
      test.context.handler.secondCall,
      sinon.match({
        body: '',
        headers: sinon.match.object,
        httpMethod: 'GET',
        path: '/other/path',
        queryStringParameters: {},
        multiValueHeaders: sinon.match.object,
        requestContext: {
          requestId: sinon.match.string
        }
      }),
      sinon.match.object,
      sinon.match.func
    );
  });

  test(`Redirects are automaticaly followed (302) (callbackStyle=${isCallbackStyleHandler})`, async (test) => {
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
      sinon.match({
        body: '',
        headers: sinon.match.object,
        httpMethod: 'GET',
        path: '/some/path',
        queryStringParameters: {},
        multiValueHeaders: sinon.match.object,
        requestContext: {
          requestId: sinon.match.string
        }
      }),
      sinon.match.object,
      sinon.match.func
    );
    sinon.assert.calledWithExactly(
      test.context.handler.secondCall,
      sinon.match({
        body: '',
        headers: sinon.match.object,
        httpMethod: 'GET',
        path: '/other/path',
        queryStringParameters: {},
        multiValueHeaders: sinon.match.object,
        requestContext: {
          requestId: sinon.match.string
        }
      }),
      sinon.match.object,
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
      queryStringParameters: {},
      multiValueHeaders: sinon.match.object,
      requestContext: {
        requestId: sinon.match.string
      }
    };

    sinon.assert.calledWithExactly(
      test.context.handler,
      sinon.match(event),
      sinon.match.object,
      sinon.match.func
    );
  });
}
registerSpecs(true);
registerSpecs(false);
