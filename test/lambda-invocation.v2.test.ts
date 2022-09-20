import { Alpha } from '../src';
import AWSLambda, { InvocationResponse } from 'aws-sdk/clients/lambda';
import nock from 'nock';
import { AxiosRequestConfig } from 'axios';
import { mock } from 'jest-mock-extended';
import { InvocationRequest } from 'aws-sdk/clients/lambda';

const MockLambda = jest.fn();
const moduleExists = jest.fn();

jest.mock('aws-sdk/clients/lambda', () => ({
  __esModule: true,
  get default() {
    return MockLambda;
  },
}));

jest.mock('../src/utils/modules', () => ({
  get moduleExists() {
    return moduleExists;
  },
}));

const lambda = mock<AWSLambda>();

let alpha: Alpha;
const invokeReturn = mock<ReturnType<AWSLambda['invoke']>>();
const abort = invokeReturn.abort;
let invokePromiseResp: Awaited<ReturnType<typeof invokeReturn['promise']>>;

const getResp = (resp: InvocationResponse = {}): Awaited<ReturnType<typeof invokeReturn['promise']>> => ({
  ...resp,
  $response: mock(),
});

beforeAll(() => {
  nock.disableNetConnect();
});

beforeEach(() => {
  alpha = new Alpha('lambda://test-function', { adapter: undefined });
  MockLambda.mockReturnValue(lambda);
  lambda.invoke.mockReturnValue(invokeReturn);
  invokePromiseResp = getResp();
  invokeReturn.promise.mockResolvedValueOnce(invokePromiseResp);

  moduleExists.mockImplementation((path) => path === 'aws-sdk/clients/lambda');
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  nock.enableNetConnect();
});

const getPayload = (idx = 0) => JSON.parse((lambda.invoke.mock.calls[idx]![0] as any as InvocationRequest).Payload as string);

test('Making a GET request with the lambda protocol invokes the lambda function', async () => {
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  });

  const response = await alpha.get('/some/path?param1=value1', { params: { param2: 'value2' } });

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  expect(lambda.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  });

  const payload = getPayload();
  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({ param1: 'value1', param2: 'value2' });
});

test('Making a GET request with responseType \'arraybuffer\' returns the correct body type', async () => {
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
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
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
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
    alpha = new Alpha(url, { awsSdkVersion: 2 });
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
  alpha = new Alpha(`lambda://test-function:${qualifier}`, { awsSdkVersion: 2 });
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  });

  const response = await alpha.get('/some/path');

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(response.headers).toEqual({ 'test-header': 'some value' });

  expect(lambda.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Qualifier: qualifier,
    Payload: expect.any(String),
  });

  const payload = getPayload();

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
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: { error: 'Bad request.' },
      headers: {},
      statusCode: 400,
    }),
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

  const payload = getPayload();

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error as Object).includes('code')).toBe(false);
  expect(lambda.invoke).toBeCalled();
});

test('When status validation is disabled errors are not thrown', async () => {
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'error!',
      statusCode: 400,
    }),
  });

  const response = await alpha.get('/some/path', { validateStatus: undefined });

  expect(response.status).toBe(400);
  expect(response.data).toBe('error!');
});

test('When a lambda function returns an Unhandled FunctionError an error is thrown', async () => {
  const errorMessage = 'A failure';
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    FunctionError: 'Unhandled',
    Payload: JSON.stringify({ errorMessage }),
  });

  const promise = alpha.get('/some/path');
  await expect(promise).rejects.toThrow(errorMessage);
  const error = await promise.catch((error) => error);

  expect(error.config).toBeTruthy();
  expect(error.config.url).toBe('lambda://test-function/some/path');

  expect(error.request.FunctionName).toBe('test-function');
  expect(error.request.InvocationType).toBe('RequestResponse');
  expect(error.request.Payload.length > 0).toBe(true);

  const payload = getPayload();

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(Object.keys(error as Object).includes('code')).toBe(false);
  expect(lambda.invoke).toBeCalled();
});

test('When a lambda function returns a Handled FunctionError an error is thrown', async () => {
  const errorMessage = 'A failure';
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    FunctionError: 'Handled',
    Payload: JSON.stringify({ errorMessage }),
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
  expect(lambda.invoke).toBeCalled();
});

test('When the Payload attribute is null an error is thrown', async () => {
  const response = {
    StatusCode: 500,
  };
  Object.assign(invokePromiseResp, response);

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
  expect(lambda.invoke).toBeCalled();
});

test('Redirects are automatically followed (301)', async () => {
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/redirect' },
      statusCode: 301,
    }),
  });

  const invokePromiseResp2 = getResp({
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200,
    }),
  });
  invokeReturn.promise.mockResolvedValueOnce(invokePromiseResp2);

  const response = await alpha.get('/some/path');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');

  expect(lambda.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  });

  let payload = getPayload();

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(lambda.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  });

  payload = getPayload(1);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/redirect');
  expect(payload.queryStringParameters).toEqual({});
});

test('Redirects are automatically followed (302)', async () => {
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/redirect' },
      statusCode: 302,
    }),
  });
  const invokePromiseResp2 = getResp({
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200,
    }),
  });
  invokeReturn.promise.mockResolvedValueOnce(invokePromiseResp2);

  const response = await alpha.get('/some/path');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');

  expect(lambda.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  });

  let payload = getPayload();

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});

  expect(lambda.invoke).toBeCalledWith({
    FunctionName: 'test-function',
    InvocationType: 'RequestResponse',
    Payload: expect.any(String),
  });

  payload = getPayload(1);

  expect(payload.body).toBe('');
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('GET');
  expect(payload.path).toBe('/redirect');
  expect(payload.queryStringParameters).toEqual({});
});

test('Binary content is base64 encoded', async () => {
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({ statusCode: 200 }),
  });

  const content = Buffer.from('hello!');
  const response = await alpha.put('/some/path', content);

  expect(response.status).toBe(200);

  expect(lambda.invoke).toBeCalledWith(
    {
      FunctionName: 'test-function',
      InvocationType: 'RequestResponse',
      Payload: expect.any(String),
    },
  );

  const payload = getPayload();

  expect(payload.body).toBe(content.toString('base64'));
  expect(payload.headers).toBeTruthy();
  expect(payload.httpMethod).toBe('PUT');
  expect(payload.isBase64Encoded).toBe(true);
  expect(payload.path).toBe('/some/path');
  expect(payload.queryStringParameters).toEqual({});
});

const delayedLambda = (delay: number, errorToThrow?: any) => {
  return class OneSecondAWSLambda {
    invoke () {
      return {
        abort,
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
  } as any as typeof AWSLambda;
};

test('timeout values are provided to the HTTP client used by the Lambda client', async () => {
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'hello!',
      headers: { 'test-header': 'some value' },
      statusCode: 200,
    }),
  });

  await alpha.get('/some/path', { timeout: 5 });

  expect(MockLambda).toBeCalledTimes(1);
  expect(MockLambda).toBeCalledWith({
    httpOptions: {
      connectTimeout: 5,
      timeout: 5,
    },
  });
});

test('A timeout can be configured for the invoked lambda function', async () => {
  const promise = alpha.get('/some/path', {
    Lambda: delayedLambda(1000), // lambda will take 1000 ms
    timeout: 5, // timeout at 5 ms
  });
  await expect(promise).rejects.toThrow();
  try {
    await promise;
  } catch (error) {
    expect((error as any).code).toBe('ECONNABORTED');
    expect(abort).toBeCalledTimes(1);
  }
});

test('A configured timeout does not hinder normal lambda function invocation behavior', async () => {
  const response = await alpha.get('/some/path', {
    Lambda: delayedLambda(1),
    timeout: 10,
  } as any as AxiosRequestConfig);
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
  const promise = alpha.get('/some/path', {
    Lambda: delayedLambda(1, new Error('Other error')),
    timeout: 1000,
  } as any as AxiosRequestConfig);
  await expect(promise).rejects.toThrow('Other error');
  expect(abort).not.toBeCalled();

  expect(setTimeout).toBeCalledTimes(1);
  expect(clearTimeout).toBeCalledTimes(1);
});

test('lambda function invocation errors are re-thrown', async () => {
  await expect(alpha.get('/some/path', {
    Lambda: delayedLambda(1, new Error('Other error')),
  } as any as AxiosRequestConfig)).rejects.toThrow('Other error');
});

test('lambdaEndpoint config option is provided to the Lambda client', async () => {
  const alpha = new Alpha('lambda://test-function', {
    lambdaEndpoint: 'http://test-endpoint',
    awsSdkVersion: 2,
  });
  Object.assign(invokePromiseResp, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'test',
      statusCode: 200,
    }),
  });

  const response = await alpha.get('/test');

  expect(response.data).toBe('test');
  expect(response.status).toBe(200);

  expect(MockLambda).toBeCalledWith({ endpoint: 'http://test-endpoint' });
});
