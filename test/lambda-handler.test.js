const { Alpha } = require('../src');
const nock = require('nock');

const response = {
  headers: { 'test-header': 'some value' },
  body: 'hello!',
  statusCode: 200,
};

const event = {
  body: '',
  headers: expect.any(Object),
  httpMethod: 'GET',
  path: '/some/path',
  queryStringParameters: {},
  multiValueHeaders: expect.any(Object),
  requestContext: expect.objectContaining({
    requestId: expect.any(String),
  }),
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
  'succeed',
];

let ctx;

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

beforeEach(() => {
  ctx = {};
  ctx.handler = jest.fn();
  ctx.client = new Alpha(ctx.handler);
});

const setupHandler = (ctx, expectedEvent, response, useCallback = false) => {
  ctx.handler.mockImplementation((event, context, cb) => {
    expect(cb).toStrictEqual(expect.any(Function));
    expect(event).toBe(event);
    expect(Object.keys(context).sort()).toEqual(contextKeys.sort());
    expect(context.getRemainingTimeInMillis()).toBe(0);
    expect(context.done()).toBe(undefined);
    expect(context.fail()).toBe(undefined);
    expect(context.succeed()).toBe(undefined);
    expect(context.awsRequestId).toMatch(
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    );
    if (useCallback) {
      cb(undefined, response);
    } else {
      return Promise.resolve(response);
    }
  });
};

test('provides a mock context', async () => {
  setupHandler(ctx, event, response);
  const result = await ctx.client.get('/some/path');

  expect(result.status).toBe(200);
  expect(result.headers).toEqual(response.headers);
  expect(result.data).toBe(response.body);
});

test('works with a callback style handler that executes the callback async', async () => {
  setupHandler(ctx, event, response, true);
  const result = await ctx.client.get('/some/path');

  expect(result.status).toBe(200);
  expect(result.headers).toEqual(response.headers);
  expect(result.data).toBe(response.body);
});

const setupHandlerBehavior = ({ handlerStub, isCallbackStyleHandler, error, response }) => {
  if (isCallbackStyleHandler) {
    handlerStub.mockImplementationOnce((req, config, cb) => cb(error, response));
  } else {
    error ? handlerStub.mockRejectedValueOnce(error) : handlerStub.mockResolvedValueOnce(response);
  }
};

const registerSpecs = (isCallbackStyleHandler) => {
  test(`Making a GET request to a local handler invokes the handler (callbackStyle=${isCallbackStyleHandler})`, async () => {
    setupHandlerBehavior({
      handlerStub: ctx.handler,
      isCallbackStyleHandler,
      response,
    });
    const result = await ctx.client.get('/some/path');

    expect(result.status).toBe(200);
    expect(result.headers).toEqual(response.headers);
    expect(result.data).toBe(response.body);

    expect(ctx.handler).toBeCalledWith(expect.objectContaining(event), expect.any(Object), expect.any(Function));
  });

  test(`Making a POST request to a local handler invokes the handler (callbackStyle=${isCallbackStyleHandler})`, async () => {
    setupHandlerBehavior({
      handlerStub: ctx.handler,
      isCallbackStyleHandler,
      response,
    });
    const result = await ctx.client.post('/some/path', { data: 'test' }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(result.status).toBe(200);
    expect(result.headers).toEqual(response.headers);
    expect(result.data).toBe(response.body);

    const event = {
      body: JSON.stringify({ data: 'test' }),
      headers: expect.any(Object),
      httpMethod: 'POST',
      path: '/some/path',
      queryStringParameters: {},
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
      }),
      multiValueHeaders: expect.any(Object),
    };

    expect(ctx.handler).toBeCalledWith(expect.objectContaining(event), expect.any(Object), expect.any(Function));
  });

  test(`When a local handler returns an error the request fails (callbackStyle=${isCallbackStyleHandler})`, async () => {
    const failure = new Error('simulated failure');
    setupHandlerBehavior({
      handlerStub: ctx.handler,
      error: failure,
      isCallbackStyleHandler,
    });

    const promise = ctx.client.get('/some/path');
    await expect(promise).rejects.toThrow(failure.message);
    const error = await promise.catch((error) => error);

    expect(error.config).toBeTruthy();
    expect(error.config.url).toBe('/some/path');

    expect(error.response).toBe(undefined);

    expect(error.request).toBeTruthy();
    expect(error.request.event.body).toBe('');
    expect(error.request.event.headers).toBeTruthy();
    expect(error.request.event.httpMethod).toBe('GET');
    expect(error.request.event.path).toBe('/some/path');
    expect(error.request.event.queryStringParameters).toEqual({});

    expect(Object.keys(error).includes('code')).toBe(false);
    expect(ctx.handler).toBeCalled();
  });

  test(`When status validation is disable errors are not thrown (callbackStyle=${isCallbackStyleHandler})`, async () => {
    const response = {
      body: 'error!',
      statusCode: 400,
    };

    setupHandlerBehavior({
      handlerStub: ctx.handler,
      response,
      isCallbackStyleHandler,
    });

    const result = await ctx.client.get('/some/path', { validateStatus: false });

    expect(result.status).toBe(response.statusCode);
    expect(result.data).toBe(response.body);
  });

  test(`Redirects are automatically followed (301) (callbackStyle=${isCallbackStyleHandler})`, async () => {
    const redirect = {
      headers: { location: '/other/path' },
      statusCode: 301,
    };

    const response = {
      body: 'hello!',
      statusCode: 200,
    };

    setupHandlerBehavior({
      handlerStub: ctx.handler,
      response: redirect,
      isCallbackStyleHandler,
    });
    setupHandlerBehavior({
      handlerStub: ctx.handler,
      response,
      isCallbackStyleHandler,
    });

    const result = await ctx.client.get('/some/path');

    expect(result.status).toBe(200);
    expect(result.data).toBe(response.body);

    expect(ctx.handler).toBeCalledWith(expect.objectContaining({
      body: '',
      headers: expect.any(Object),
      httpMethod: 'GET',
      path: '/some/path',
      queryStringParameters: {},
      multiValueHeaders: expect.any(Object),
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
      }),
    }), expect.any(Object), expect.any(Function));
    expect(ctx.handler).toBeCalledWith(expect.objectContaining({
      body: '',
      headers: expect.any(Object),
      httpMethod: 'GET',
      path: '/other/path',
      queryStringParameters: {},
      multiValueHeaders: expect.any(Object),
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
      }),
    }), expect.any(Object), expect.any(Function));
  });

  test(`Redirects are automatically followed (302) (callbackStyle=${isCallbackStyleHandler})`, async () => {
    const redirect = {
      headers: { location: '/other/path' },
      statusCode: 302,
    };

    const response = {
      body: 'hello!',
      statusCode: 200,
    };

    setupHandlerBehavior({
      handlerStub: ctx.handler,
      response: redirect,
      isCallbackStyleHandler,
    });
    setupHandlerBehavior({
      handlerStub: ctx.handler,
      response,
      isCallbackStyleHandler,
    });

    const result = await ctx.client.get('/some/path');

    expect(result.status).toBe(200);
    expect(result.data).toBe(response.body);

    expect(ctx.handler).toBeCalledWith(expect.objectContaining({
      body: '',
      headers: expect.any(Object),
      httpMethod: 'GET',
      path: '/some/path',
      queryStringParameters: {},
      multiValueHeaders: expect.any(Object),
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
      }),
    }), expect.any(Object), expect.any(Function));
    expect(ctx.handler).toBeCalledWith(expect.objectContaining({
      body: '',
      headers: expect.any(Object),
      httpMethod: 'GET',
      path: '/other/path',
      queryStringParameters: {},
      multiValueHeaders: expect.any(Object),
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
      }),
    }), expect.any(Object), expect.any(Function));
  });

  test(`Binary content is base64 encoded (callbackStyle=${isCallbackStyleHandler})`, async () => {
    const content = Buffer.from('hello!');

    const response = {
      statusCode: 204,
    };

    setupHandlerBehavior({
      handlerStub: ctx.handler,
      response,
      isCallbackStyleHandler,
    });
    const result = await ctx.client.put('/some/path', content);

    expect(result.status).toBe(204);

    const event = {
      body: content.toString('base64'),
      headers: expect.any(Object),
      httpMethod: 'PUT',
      isBase64Encoded: true,
      path: '/some/path',
      queryStringParameters: {},
      multiValueHeaders: expect.any(Object),
      requestContext: expect.objectContaining({
        requestId: expect.any(String),
      }),
    };

    expect(ctx.handler).toBeCalledWith(expect.objectContaining(event), expect.any(Object), expect.any(Function));
  });
};

registerSpecs(true);
registerSpecs(false);
