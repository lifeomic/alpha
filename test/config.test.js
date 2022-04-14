const { Alpha } = require('../src');
const { Axios } = require('axios');
const nock = require('nock');
const test = require('ava');

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

  const client = new Alpha();
  test.true(client instanceof Axios);

  const response = await client.get('/some/path');

  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('Creating a client with a target binds the client to the target', async (test) => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(200, 'hello!');

  const client = new Alpha('http://example.com');
  test.true(client instanceof Axios);

  const response = await client.get('/some/path');

  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('Creating a client with configuration options sets the default client options', async (test) => {
  const server = nock('http://localhost')
    .get('/some/path?foo=bar')
    .matchHeader('Accept', 'application/json')
    .reply(200, { message: 'hello!' });

  const options = {
    params: {
      foo: 'bar'
    },
    headers: {
      'Accept': 'application/json'
    }
  };

  const client = new Alpha(options);
  test.true(client instanceof Axios);

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

  const options = {
    headers: {
      'Accept': 'application/json'
    }
  };

  const client = new Alpha('http://example.com', options);
  test.true(client instanceof Axios);

  const response = await client.get('/some/path');

  test.is(response.data.message, 'hello!');
  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('A custom status validator can be used with the client', async (test) => {
  const server = nock('http://example.com')
    .get('/')
    .reply(302, { location: '/redirect' });

  const options = {
    validateStatus: (status) => status >= 200 && status < 300
  };

  const client = new Alpha('http://example.com', options);
  const error = await test.throwsAsync(client.get('/'));

  test.is(error.message, 'Request failed with status code 302');
  test.true(server.isDone());
});
