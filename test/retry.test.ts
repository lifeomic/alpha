import { Alpha } from '../src';
import nock from 'nock';
import { AxiosError, AxiosHeaders } from 'axios';

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
});

const defaultOptions = { headers: new AxiosHeaders() };

test('Making a request with retries enabled should succeed if the number of failed requests is less than the number of attempts', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = new Alpha('http://example.com', { ...defaultOptions, retry: true });
  const response = await alpha.get('/some/path');

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(server.isDone()).toBe(true);
});

test('Making a request with retries enabled and a custom retry condition should success if the number of failed requests is less than the number of attempts', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(404)
    .get('/some/path')
    .reply(404)
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = new Alpha('http://example.com', {
    ...defaultOptions,
    retry: {
      retryCondition: (error) => (error as AxiosError).response!.status === 404,
    },
  });
  const response = await alpha.get('/some/path');

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);
  expect(server.isDone()).toBe(true);
});

test('Making a request with retries enabled and a custom retry condition should fail for an error that is not retryable', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(403);

  const alpha = new Alpha('http://example.com', {
    ...defaultOptions,
    retry: {
      retryCondition: (error) => (error as AxiosError).response!.status === 404,
    },
  });
  const promise = alpha.get('/some/path');
  await expect(promise).rejects.toThrow();
  const err = await promise.catch((error) => error);
  expect(err.response.status).toBe(403);

  expect(server.isDone()).toBe(true);
});

test('Making a request with retries enabled should fail for an error that is not retryable', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(403);

  const alpha = new Alpha('http://example.com', { ...defaultOptions, retry: true });
  const promise = alpha.get('/some/path');
  await expect(promise).rejects.toThrow();
  const err = await promise.catch((error) => error);
  expect(err.response.status).toBe(403);

  expect(server.isDone()).toBe(true);
});

test('Making a request with retries enabled should fail when the number of requests exceeds the configured number of attempts', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = new Alpha('http://example.com', { ...defaultOptions, retry: { attempts: 2 } });
  const promise = alpha.get('/some/path');
  await expect(promise).rejects.toThrow();
  const err = await promise.catch((error) => error);
  expect(err.response.status).toBe(503);

  // Should not be done because we exceeded number of attempts
  expect(!server.isDone()).toBe(true);
});
