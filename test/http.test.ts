import { AxiosHeaders } from 'axios';
import { Alpha } from '../src';
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

test('Making a GET request with the http protocol performs a normal HTTP request', async () => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = new Alpha('http://example.com');
  const response = await alpha.get('/some/path');

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);

  expect(response.headers).toEqual(new AxiosHeaders({ 'test-header': 'some value' }));

  expect(server.isDone()).toBe(true);
});

test('Making a GET request with the https protocol performs a normal HTTPS request', async () => {
  const server = nock('https://example.com')
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = new Alpha('https://example.com');
  const response = await alpha.get('/some/path');

  expect(response.data).toBe('hello!');
  expect(response.status).toBe(200);

  expect(response.headers).toEqual(new AxiosHeaders({ 'test-header': 'some value' }));

  expect(server.isDone()).toBe(true);
});
