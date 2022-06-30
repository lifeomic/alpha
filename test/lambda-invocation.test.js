const { Alpha } = require('../src');
const AWS_SDK = require('aws-sdk');
const AWS = require('aws-sdk-mock');
const nock = require('nock');

let ctx;

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

beforeEach(() => {
  ctx = {};
  ctx.alpha = new Alpha('lambda://test-function', { adapter: null });
  ctx.invoke = jest.fn();
  AWS.mock('Lambda', 'invoke', ctx.invoke);
  jest.spyOn(AWS_SDK, 'Lambda');
  ctx.abort = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  AWS.restore();
});

test('Making a GET request with the lambda protocol invokes the lambda function', async () => {
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  }));

  const response = await ctx.alpha.get('/some/path?param1=value1', { params: { param2: 'value2' } });

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  expect(ctx.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  }, expect.any(Function));

  const payload = JSON.parse(ctx.invoke.mock.calls[0][0].Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({ param1: 'value1', param2: 'value2' });
});

test('Making a GET request with responseType \'arraybuffer\' returns the correct body type', async () => {
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  }));

  const response = await ctx.alpha.get('/some/path?param1=value1', {
    params: { param2: 'value2' },
    responseType: 'arraybuffer',
  });

  // Assert that the right type is returned
  expect(Object.prototype.toString.call(response.data)).toBe('[object Uint8Array]');
  // Assert that the right content is returned
  expect(Buffer.from(response.data).toString('utf8')).toBe('hello!');
  expect(response.status).toBe(200);
});

test('Making a GET request with responseType \'stream\' throws an unsupported error', async () => {
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  }));

  const response = ctx.alpha.get('/some/path?param1=value1', {
    params: { param2: 'value2' },
    responseType: 'stream',
  });
  await expect(response).rejects.toThrow('Unhandled responseType requested: stream');
});

test('Invalid URLs cause Errors to be thrown', async () => {
  const assertInvalidUrl = async (url) => {
    // Override the shared alpha client to include a qualifier
    ctx.alpha = new Alpha(url);
    const response = ctx.alpha.get('/some/path');
    await expect(response).rejects.toThrow(`The config.url, '${url}/some/path' does not appear to be a Lambda Function URL`);
  };
  await assertInvalidUrl('lambda://test-function.test');
  await assertInvalidUrl('lambda://test-function.test/test');
  await assertInvalidUrl('lambda://test-function.test:2345');
  await assertInvalidUrl('lambda://test-function.test:2345:another');
  await assertInvalidUrl('lambda://test-function.test:2345:another/test');
});

const testLambdaWithQualifier = async (qualifier) => {
  // Override the shared alpha client to include a qualifier
  ctx.alpha = new Alpha(`lambda://test-function:${qualifier}`);
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  }));

  const response = await ctx.alpha.get('/some/path');

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  expect(ctx.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Qualifier: qualifier,
    Payload: expect.any(String),
  }, expect.any(Function));

  const payload = JSON.parse(ctx.invoke.mock.calls[0][0].Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});
};

test('Making a GET request with the lambda protocol with a numeric qualifier invokes the lambda function using a qualifier', async () => {
  await testLambdaWithQualifier('2');
});

test('Making a GET request with the lambda protocol with a non-numeric qualifier invokes the lambda function using a qualifier', async () => {
  await testLambdaWithQualifier('deployed');
});

test('Making a GET request with the lambda protocol with an explicit $LATEST qualifier invokes the lambda function using a qualifier', async () => {
  await testLambdaWithQualifier('$LATEST');
});

test('When a lambda function returns an error code an error is thrown', async () => {
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: { error: 'Bad request.' },
      headers: {},
      statusCode: 400,
    }),
  }));

  const promise = ctx.alpha.get('/some/path');
  await expect(promise).rejects.toThrow('Request failed with status code 400');
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.response.status).toBe(400);
  expect(error.response.headers).toEqual({});
  expect(error.response.data).toEqual({ error: 'Bad request.' });

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = JSON.parse(error.request.Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error).includes('code')).toBe(false);
  expect(ctx.invoke).toBeCalled();
});

test('When status validation is disabled errors are not thrown', async () => {
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'error!',
      statusCode: 400,
    }),
  }));

  const response = await ctx.alpha.get('/some/path', { validateStatus: false });

  expect(response.status).toBe(400);
  expect(response.data).toBe('error!');
});

test('When a lambda function returns an Unhandled FunctionError an error is thrown', async () => {
  const errorMessage = 'A failure';
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    FunctionError: 'Unhandled',
    Payload: JSON.stringify({ errorMessage }),
  }));

  const promise = ctx.alpha.get('/some/path');
  await expect(promise).rejects.toThrow(errorMessage);
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = JSON.parse(error.request.Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error).includes('code')).toBe(false);
  expect(ctx.invoke).toBeCalled();
});

test('When a lambda function returns a Handled FunctionError an error is thrown', async () => {
  const errorMessage = 'A failure';
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    FunctionError: 'Handled',
    Payload: JSON.stringify({ errorMessage }),
  }));

  const promise = ctx.alpha.get('/some/path');
  await expect(promise).rejects.toThrow(errorMessage);
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = JSON.parse(error.request.Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error).includes('code')).toBe(false);
  expect(ctx.invoke).toBeCalled();
});

test('When the Payload attribute is null an error is thrown', async () => {
  const response = {
    StatusCode: 500,
    Payload: null,
  };
  ctx.invoke.mockImplementation((req, cb) => cb(null, response));

  const promise = ctx.alpha.get('/some/path');
  await expect(promise).rejects.toThrow(`Unexpected Payload shape from lambda://test-function/some/path. The full response was\n${JSON.stringify(response, null, '  ')}`);
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = JSON.parse(error.request.Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error).includes('code')).toBe(false);
  expect(ctx.invoke).toBeCalled();
});

test('Redirects are automatically followed (301)', async () => {
  ctx.invoke.mockImplementationOnce((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/redirect' },
      statusCode: 301,
    }),
  }));
  ctx.invoke.mockImplementationOnce((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200,
    }),
  }));

  const response = await ctx.alpha.get('/some/path');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');

  expect(ctx.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  }, expect.any(Function));

  let payload = JSON.parse(ctx.invoke.mock.calls[0][0].Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(ctx.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  }, expect.any(Function));

  payload = JSON.parse(ctx.invoke.mock.calls[1][0].Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/redirect');
  expect(payload.queryStringParameters).toEqual({});
});

test('Redirects are automatically followed (302)', async () => {
  ctx.invoke.mockImplementationOnce((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/redirect' },
      statusCode: 302,
    }),
  }));
  ctx.invoke.mockImplementationOnce((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200,
    }),
  }));

  const response = await ctx.alpha.get('/some/path');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');

  expect(ctx.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  }, expect.any(Function));

  let payload = JSON.parse(ctx.invoke.mock.calls[0][0].Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(ctx.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  }, expect.any(Function));

  payload = JSON.parse(ctx.invoke.mock.calls[1][0].Payload);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/redirect');
  expect(payload.queryStringParameters).toEqual({});
});

test('Binary content is base64 encoded', async () => {
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({ statusCode: 200 }),
  }));

  const content = Buffer.from('hello!');
  const response = await ctx.alpha.put('/some/path', content);

  expect(response.status).toBe(200);

  expect(ctx.invoke).toBeCalledWith(
    {
      FunctionName: 'test-function',
      InvocationType: 'RequestResponse',
      Payload: expect.any(String),
    },
    expect.any(Function),
  );

  const payload = JSON.parse(ctx.invoke.mock.calls[0][0].Payload);

  expect(payload.body).toBe(content.toString('base64'));
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('PUT');
  expect(payload.isBase64Encoded).toBe(true);
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});
});

const delayedLambda = (test, delay, errorToThrow) => {
  return class OneSecondAWSLambda {
    invoke () {
      return {
        abort: ctx.abort,
        promise: () => {
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
                  statusCode: 200,
                }),
              });
            }, delay);
          });
        },
      };
    }
  };
};

test('timeout values are provided to the HTTP client used by the Lambda client', async () => {
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  }));

  await ctx.alpha.get('/some/path', { timeout: 5 });

  expect(AWS_SDK.Lambda).toBeCalledTimes(1);
  expect(AWS_SDK.Lambda).toBeCalledWith({
    httpOptions: {
      connectTimeout: 5,
      timeout: 5,
    },
  });
});

test('A timeout can be configured for the invoked lambda function', async () => {
  let error;
  const promise = ctx.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1000), // lambda will take 1000 ms
    timeout: 5, // timeout at 5 ms
  });
  await expect(promise).rejects.toThrow();
  try {
    await promise;
  } catch (e) {
    error = e;
  }

  expect(error.code).toBe('ECONNABORTED');
  expect(ctx.abort).toBeCalledTimes(1);
});

test('A configured timeout does not hinder normal lambda function invocation behavior', async () => {
  const response = await ctx.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1),
    timeout: 10,
  });
  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  // By ending the test 10ms after the timeout, we ensure that the internal setTimeout firing doesn't
  // cause any negative side effects, such as attempting to abort after the lambda finished.
  await new Promise((resolve) => {
    setTimeout(() => {
      expect(ctx.abort).toBeCalledTimes(0);
      resolve(undefined);
    }, 20);
  });
});

test('A configured timeout does not eat lambda function invocation errors', async () => {
  jest.useFakeTimers();
  jest.spyOn(global, 'setTimeout');
  jest.spyOn(global, 'clearTimeout');
  const promise = ctx.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1, new Error('Other error')),
    timeout: 1000,
  });
  await expect(promise).rejects.toThrow('Other error');
  expect(ctx.abort).not.toBeCalled();

  expect(setTimeout).toBeCalledTimes(1);
  expect(clearTimeout).toBeCalledTimes(1);
});

test('lambda function invocation errors are re-thrown', async () => {
  await expect(ctx.alpha.get('/some/path', {
    Lambda: delayedLambda(test, 1, new Error('Other error')),
  })).rejects.toThrow('Other error');
});

test('lambdaEndpoint config option is provided to the Lambda client', async () => {
  const alpha = new Alpha('lambda://test-function', {
    lambdaEndpoint: 'http://test-endpoint',
  });
  ctx.invoke.mockImplementation((req, cb) => cb(null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'test',
      statusCode: 200,
    }),
  }));

  const response = await alpha.get('/test');

  expect(response.data).toBe('test');
  expect(response.status).toBe(200);

  expect(AWS_SDK.Lambda).toBeCalledWith({ endpoint: 'http://test-endpoint' });
});
