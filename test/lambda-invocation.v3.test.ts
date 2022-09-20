import { Alpha } from '../src';
import nock from 'nock';
import { Lambda, InvokeCommand, InvokeCommandInput } from '@aws-sdk/client-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { prepResponse, createResponse } from './utils';

const mockLambda = mockClient(Lambda);
const moduleExists = jest.fn();
const FakeLambda = jest.fn() as jest.MockedClass<typeof Lambda>;

let alpha: Alpha;
const abort = jest.fn();

jest.mock('../src/utils/modules', () => ({
  get moduleExists() {
    return moduleExists;
  },
}));

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

beforeEach(() => {
  alpha = new Alpha('lambda://test-function', { adapter: undefined });
  FakeLambda.mockReturnValue(new Lambda({}));
  moduleExists.mockImplementation((path) => path === '@aws-sdk/client-lambda');
});

afterEach(() => {
  mockLambda.reset();
});

const getIn = (
  call = 0,
): InvokeCommandInput => {
  const calls = mockLambda.commandCalls(InvokeCommand);
  return calls[call].firstArg.input;
};

const getPayload = (cmd: InvokeCommandInput) => {
  return JSON.parse(Buffer.from(cmd.Payload as Uint8Array).toString('utf-8'));
};

test('Making a GET request with the lambda protocol invokes the lambda function', async () => {
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    },
  });

  const response = await alpha.get('/some/path?param1=value1', { params: { param2: 'value2' } });

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  const cmdInput = getIn();

  expect(cmdInput).toEqual({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(Buffer),
  });

  const payload = getPayload(cmdInput);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({ param1: 'value1', param2: 'value2' });
});

test('Making a GET request with responseType \'arraybuffer\' returns the correct body type', async () => {
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    },
  });

  const response = await alpha.get<Buffer>('/some/path?param1=value1', {
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
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    },
  });

  const response = alpha.get('/some/path?param1=value1', {
    params: { param2: 'value2' },
    responseType: 'stream',
  });
  await expect(response).rejects.toThrow('Unhandled responseType requested: stream');
});

test('Invalid URLs cause Errors to be thrown', async () => {
  const assertInvalidUrl = async (url: string) => {
    // Override the shared alpha client to include a qualifier
    alpha = new Alpha(url, { awsSdkVersion: 3 });
    const response = alpha.get('/some/path');
    await expect(response).rejects.toThrow(`The config.url, '${url}/some/path' does not appear to be a Lambda Function URL`);
  };
  await assertInvalidUrl('lambda://test-function.test');
  await assertInvalidUrl('lambda://test-function.test/test');
  await assertInvalidUrl('lambda://test-function.test:2345');
  await assertInvalidUrl('lambda://test-function.test:2345:another');
  await assertInvalidUrl('lambda://test-function.test:2345:another/test');
});

const testLambdaWithQualifier = async (qualifier: string) => {
  // Override the shared alpha client to include a qualifier
  alpha = new Alpha(`lambda://test-function:${qualifier}`, { awsSdkVersion: 3 });
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    },
  });

  const response = await alpha.get('/some/path');

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  const cmdInput = getIn();
  expect(cmdInput).toEqual({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Qualifier: qualifier,
    Payload: expect.any(Buffer),
  });

  const payload = getPayload(cmdInput);

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
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: { error: 'Bad request.' },
      headers: {},
      statusCode: 400,
    },
  });

  const promise = alpha.get('/some/path');
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

  const payload = JSON.parse(error.request.Payload as string);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error as Object).includes('code')).toBe(false);
  expect(mockLambda.commandCalls(InvokeCommand)).toHaveLength(1);
});

test('When status validation is disabled errors are not thrown', async () => {
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'error!',
      statusCode: 400,
    },
  });

  const response = await alpha.get('/some/path', { validateStatus: undefined });

  expect(response.status).toBe(400);
  expect(response.data).toBe('error!');
});

test('When a lambda function returns an Unhandled FunctionError an error is thrown', async () => {
  const errorMessage = 'A failure';
  createResponse(mockLambda, {
    StatusCode: 200,
    FunctionError: 'Unhandled',
    Payload: { errorMessage },
  });

  const promise = alpha.get('/some/path');
  await expect(promise).rejects.toThrow(errorMessage);
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = JSON.parse(error.request.Payload as string);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error as Object).includes('code')).toBe(false);
  expect(mockLambda.commandCalls(InvokeCommand)).toHaveLength(1);
});

test('When a lambda function returns a Handled FunctionError an error is thrown', async () => {
  const errorMessage = 'A failure';
  createResponse(mockLambda, {
    StatusCode: 200,
    FunctionError: 'Handled',
    Payload: { errorMessage },
  });

  const promise = alpha.get('/some/path');
  await expect(promise).rejects.toThrow(errorMessage);
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = JSON.parse(error.request.Payload as string);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error as Object).includes('code')).toBe(false);
  expect(mockLambda.commandCalls(InvokeCommand)).toHaveLength(1);
});

test('When the Payload attribute is null an error is thrown', async () => {
  const response = {
    StatusCode: 500,
  };
  createResponse(mockLambda, response);

  const promise = alpha.get('/some/path');
  await expect(promise).rejects.toThrow(`Unexpected Payload shape from lambda://test-function/some/path. The full response was\n${JSON.stringify(response, null, '  ')}`);
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = JSON.parse(error.request.Payload as string);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error as Object).includes('code')).toBe(false);
  expect(mockLambda.commandCalls(InvokeCommand)).toHaveLength(1);
});

test.each([301, 302])('Redirects are automatically followed (%i)', async (redirectCode) => {
  mockLambda.on(InvokeCommand)
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        headers: { location: '/redirect' },
        statusCode: redirectCode,
      },
    }))
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        body: 'we made it alive!',
        statusCode: 200,
      },
    }));

  const response = await alpha.get('/some/path');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');

  let cmdIn = getIn();
  expect(cmdIn).toEqual({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(Buffer),
  });

  let payload = getPayload(cmdIn);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  cmdIn = getIn(1);

  expect(cmdIn).toEqual({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(Buffer),
  });

  payload = getPayload(cmdIn);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/redirect');
  expect(payload.queryStringParameters).toEqual({});
});

test('Binary content is base64 encoded', async () => {
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: { statusCode: 200 },
  });

  const content = Buffer.from('hello!');
  const response = await alpha.put('/some/path', content);

  expect(response.status).toBe(200);

  const cmdIn = getIn();
  expect(cmdIn).toEqual(
    {
      FunctionName: 'test-function',
      InvocationType: 'RequestResponse',
      Payload: expect.any(Buffer),
    },
  );

  const payload = getPayload(cmdIn);

  expect(payload.body).toBe(content.toString('base64'));
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('PUT');
  expect(payload.isBase64Encoded).toBe(true);
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});
});

const delayedLambda = (delay: number, errorToThrow?: any) => {
  mockLambda.on(InvokeCommand).callsFake(() => new Promise((resolve, reject) => {
    if (errorToThrow) {
      return reject(errorToThrow);
    }
    setTimeout(() => {
      resolve({
        StatusCode: 200,
        Payload: Buffer.from(JSON.stringify({
          body: 'hello!',
          headers: { 'test-header': 'some value' },
          statusCode: 200,
        })),
      });
    }, delay);
  }));

  return FakeLambda;
};

test('timeout values are provided to the HTTP client used by the Lambda client', async () => {
  const FakeLambda = jest.fn() as jest.MockedClass<typeof Lambda>;
  FakeLambda.mockReturnValue(new Lambda({}));
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    },
  });

  await alpha.get('/some/path', { timeout: 5, Lambda: FakeLambda, awsSdkVersion: 3 });

  expect(FakeLambda).toBeCalledTimes(1);
  const { requestHandler } = FakeLambda.mock.calls[0][0];
  const config = await (requestHandler as any).configProvider;
  expect(config).toEqual(expect.objectContaining({
    connectionTimeout: 5,
    socketTimeout: 5,
  }));
});

test('A timeout can be configured for the invoked lambda function', async () => {
  delayedLambda(1000);
  const promise = alpha.get('/some/path', {
    Lambda: FakeLambda, // lambda will take 1000 ms
    timeout: 5, // timeout at 5 ms
    awsSdkVersion: 3,
  });
  await expect(promise).rejects.toThrow();
  const error = await promise.catch((err) => err);

  expect((error as any).code).toBe('ECONNABORTED');
  const { abortSignal } = mockLambda.commandCalls(InvokeCommand)[0].lastArg;
  expect(abortSignal).toHaveProperty('_aborted', true);
});

test('A configured timeout does not hinder normal lambda function invocation behavior', async () => {
  delayedLambda(1);
  const response = await alpha.get('/some/path', {
    Lambda: FakeLambda,
    timeout: 10,
    awsSdkVersion: 3,
  });
  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  // By ending the test 10ms after the timeout, we ensure that the internal setTimeout firing doesn't
  // cause any negative side effects, such as attempting to abort after the lambda finished.
  await new Promise((resolve) => {
    setTimeout(() => {
      expect(abort).toBeCalledTimes(0);
      resolve(undefined);
    }, 20);
  });
});

test('A configured timeout does not eat lambda function invocation errors', async () => {
  jest.useFakeTimers();
  jest.spyOn(global, 'setTimeout');
  jest.spyOn(global, 'clearTimeout');
  delayedLambda(1, new Error('Other error'));
  const promise = alpha.get('/some/path', {
    Lambda: FakeLambda,
    awsSdkVersion: 3,
    timeout: 1000,
  });
  await expect(promise).rejects.toThrow('Other error');
  expect(abort).not.toBeCalled();

  expect(setTimeout).toBeCalledTimes(1);
  expect(clearTimeout).toBeCalledTimes(1);
});

test('lambda function invocation errors are re-thrown', async () => {
  delayedLambda(1, new Error('Other error'));
  await expect(alpha.get('/some/path', {
    Lambda: FakeLambda,
    awsSdkVersion: 3,
  })).rejects.toThrow('Other error');
});

test('lambdaEndpoint config option is provided to the Lambda client', async () => {
  const alpha = new Alpha('lambda://test-function', {
    lambdaEndpoint: 'http://test-endpoint',
    Lambda: FakeLambda,
    awsSdkVersion: 3,
  });
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'test',
      statusCode: 200,
    },
  });

  const response = await alpha.get('/test');

  expect(response.data).toBe('test');
  expect(response.status).toBe(200);

  expect(FakeLambda).toBeCalledWith({ endpoint: 'http://test-endpoint' });
});
