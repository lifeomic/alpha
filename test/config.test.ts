import test from 'ava';
import {AxiosRequestConfig} from 'axios';
import nock from  'nock';

import configureAxios from '../src/index';

test.before(() => {
  nock.disableNetConnect();
});

test.after(() => {
  nock.enableNetConnect();
});

test.afterEach.always(() => {
  nock.cleanAll();
});

test.serial('Creating a client with no options creates a standard Axios client', async (test) => {
  const server = nock('http://localhost')
    .get('/some/path')
    .reply(200, 'hello!');

  const client = configureAxios();

  const response = await client.get('/some/path');

  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('Creating a client with a target binds the client to the target', async (test) => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(200, 'hello!');

  const client = configureAxios({url: 'http://example.com'});

  const response = await client.get('/some/path');

  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('Creating a client with configuration options sets the default client options', async (test) => {
  const server = nock('http://localhost')
    .get('/some/path')
    .matchHeader('Accept', 'application/json')
    .reply(200, { message: 'hello!' });

  const config: Partial<AxiosRequestConfig> = {
    headers: {
      'Accept': 'application/json'
    }
  };

  const client = configureAxios({config});

  const response = await client.get('/some/path');

  test.is(response.data.message, 'hello!');
  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('Creating a client with a target and configuration options binds the client to the target and set the defaults', async (test) => {
  const server = nock('http://example.com')
    .get('/some/path')
    .matchHeader('Accept', 'application/json')
    .reply(200, { message: 'hello!' });

  const config: Partial<AxiosRequestConfig> = {
    headers: {
      'Accept': 'application/json'
    }
  };

  const client = configureAxios({url: 'http://example.com', config});

  const response = await client.get('/some/path');

  test.is(response.data.message, 'hello!');
  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('A custom status validator can be used with the client', async (test) => {
  const server = nock('http://example.com')
    .get('/')
    .reply(302, { location: '/redirect' });

  const config: Partial<AxiosRequestConfig> = {
    validateStatus: (status) => status >= 200 && status < 300
  };

  const client = configureAxios({url: 'http://example.com', config});
  const error = await test.throwsAsync(() => client.get('/'));

  test.is(error.message, 'Request failed with status code 302');
  test.true(server.isDone());
});

test.serial('We can tell Alpha to ignore redirects', async (test) => {
  const server = nock('http://example.com')
    .get('/')
    .reply(302, { location: '/redirect' });

  const client = configureAxios({url: 'http://example.com', ignoreRedirects: true});
  const error = await test.throwsAsync(() => client.get('/'));

  test.is(error.message, 'Request failed with status code 302');
  test.true(server.isDone());
});
