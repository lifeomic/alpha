import { Alpha } from '../src';
import { Axios } from 'axios';
import nock from 'nock';

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
});

test('Creating a client with no options creates a standard Axios client', async () => {
  const server = nock('http://localhost')
    .get('/some/path')
    .reply(200, 'hello!');

  const client = new Alpha();
  expect(client instanceof Axios).toBe(true);

  const response = await client.get('/some/path');

  expect(response.status).toBe(200);
  expect(server.isDone()).toBe(true);
});

test('Creating a client with a target binds the client to the target', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(200, 'hello!');

  const client = new Alpha('http://example.com');
  expect(client instanceof Axios).toBe(true);

  const response = await client.get('/some/path');

  expect(response.status).toBe(200);
  expect(server.isDone()).toBe(true);
});

test('Creating a client with configuration options sets the default client options', async () => {
  const server = nock('http://localhost')
    .get('/some/path?foo=bar')
    .matchHeader('Accept', 'application/json')
    .reply(200, { message: 'hello!' });

  const options = {
    params: {
      foo: 'bar',
    },
    headers: {
      'Accept': 'application/json',
    },
  };

  const client = new Alpha(options);
  expect(client instanceof Axios).toBe(true);

  const response = await client.get('/some/path');

  expect(response.data.message).toBe('hello!');
  expect(response.status).toBe(200);
  expect(server.isDone()).toBe(true);
});

test('Creating a client with a target and configuration options binds the client to the target and set the defaults', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .matchHeader('Accept', 'application/json')
    .reply(200, { message: 'hello!' });

  const options = {
    headers: {
      'Accept': 'application/json',
    },
  };

  const client = new Alpha('http://example.com', options);
  expect(client instanceof Axios).toBe(true);

  const response = await client.get('/some/path');

  expect(response.data.message).toBe('hello!');
  expect(response.status).toBe(200);
  expect(server.isDone()).toBe(true);
});

test('A custom status validator can be used with the client', async () => {
  const server = nock('http://example.com')
    .get('/')
    .reply(302, { location: '/redirect' });

  const options = {
    validateStatus: (status: number) => status >= 200 && status < 300,
  };

  const client = new Alpha('http://example.com', options);
  await expect(client.get('/')).rejects.toThrow('Request failed with status code 302');

  expect(server.isDone()).toBe(true);
});
