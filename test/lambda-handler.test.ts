import { Alpha } from '../src';
import nock from 'nock';
import { Handler } from 'aws-lambda';

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

const handler = jest.fn() as jest.MockedFn<Handler>;
let client: Alpha;

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

beforeEach(() => {
  client = new Alpha(handler, { awsSdkVersion: 3 });
});

const setupHandler = (expectedEvent: any, response: any, useCallback = false) => {
  handler.mockImplementation((event, context, cb) => {
    expect(cb).toStrictEqual(expect.any(Function));
    expect(event).toBe(event);
    expect(Object.keys(context).sort()).toEqual(contextKeys.sort());
    expect(context.getRemainingTimeInMillis()).toBe(0);
    expect(context.done()).toBe(undefined);
    expect(context.fail(new Error())).toBe(undefined);
    expect(context.succeed(undefined)).toBe(undefined);
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
  setupHandler(event, response);
  const result = await client.get('/some/path');

  expect(result.status).toBe(200);
  expect(result.headers).toEqual(response.headers);
  expect(result.data).toBe(response.body);
});

test('works with a callback style handler that executes the callback async', async () => {
  setupHandler(event, response, true);
  const result = await client.get('/some/path');

  expect(result.status).toBe(200);
  expect(result.headers).toEqual(response.headers);
  expect(result.data).toBe(response.body);
});

interface SetupHandlerBehavior {
  handlerStub: jest.MockedFn<Handler>;
  isCallbackStyleHandler?: boolean;
  error?: string | Error | null;
  response?: any;
}

const setupHandlerBehavior = ({ handlerStub, isCallbackStyleHandler, error, response }: SetupHandlerBehavior) => {
  if (isCallbackStyleHandler) {
    handlerStub.mockImplementationOnce((req, config, cb) => cb(error, response));
  } else {
    error ? handlerStub.mockRejectedValueOnce(error) : handlerStub.mockResolvedValueOnce(response);
  }
};

const registerSpecs = (isCallbackStyleHandler: boolean) => {
  test(`Making a GET request to a local handler invokes the handler (callbackStyle=${isCallbackStyleHandler})`, async () => {
    setupHandlerBehavior({
      handlerStub: handler,
      isCallbackStyleHandler,
      response,
    });
    const result = await client.get('/some/path');

    expect(result.status).toBe(200);
    expect(result.headers).toEqual(response.headers);
    expect(result.data).toBe(response.body);

    expect(handler).toBeCalledWith(expect.objectContaining(event), expect.any(Object), expect.any(Function));
  });

  test(`Making a POST request to a local handler invokes the handler (callbackStyle=${isCallbackStyleHandler})`, async () => {
    setupHandlerBehavior({
      handlerStub: handler,
      isCallbackStyleHandler,
      response,
    });
    const result = await client.post('/some/path', { data: 'test' }, {
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

    expect(handler).toBeCalledWith(expect.objectContaining(event), expect.any(Object), expect.any(Function));
  });

  test(`When a local handler returns an error the request fails (callbackStyle=${isCallbackStyleHandler})`, async () => {
    const failure = new Error('simulated failure');
    setupHandlerBehavior({
      handlerStub: handler,
      error: failure,
      isCallbackStyleHandler,
    });

    const promise = client.get('/some/path');
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

    expect(Object.keys(error as Object).includes('code')).toBe(false);
    expect(handler).toBeCalled();
  });

  test(`When status validation is disable errors are not thrown (callbackStyle=${isCallbackStyleHandler})`, async () => {
    const response = {
      body: 'error!',
      statusCode: 400,
    };

    setupHandlerBehavior({
      handlerStub: handler,
      response,
      isCallbackStyleHandler,
    });

    const result = await client.get('/some/path', { validateStatus: undefined });

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
      handlerStub: handler,
      response: redirect,
      isCallbackStyleHandler,
    });
    setupHandlerBehavior({
      handlerStub: handler,
      response,
      isCallbackStyleHandler,
    });

    const result = await client.get('/some/path');

    expect(result.status).toBe(200);
    expect(result.data).toBe(response.body);

    expect(handler).toBeCalledWith(expect.objectContaining({
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
    expect(handler).toBeCalledWith(expect.objectContaining({
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
      handlerStub: handler,
      response: redirect,
      isCallbackStyleHandler,
    });
    setupHandlerBehavior({
      handlerStub: handler,
      response,
      isCallbackStyleHandler,
    });

    const result = await client.get('/some/path');

    expect(result.status).toBe(200);
    expect(result.data).toBe(response.body);

    expect(handler).toBeCalledWith(expect.objectContaining({
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
    expect(handler).toBeCalledWith(expect.objectContaining({
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
      handlerStub: handler,
      response,
      isCallbackStyleHandler,
    });
    const result = await client.put('/some/path', content);

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

    expect(handler).toBeCalledWith(expect.objectContaining(event), expect.any(Object), expect.any(Function));
  });
};

registerSpecs(true);
registerSpecs(false);
