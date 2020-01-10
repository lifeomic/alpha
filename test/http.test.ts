import test from 'ava';
import nock from 'nock';

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

test.serial('Making a GET request with the http protocol performs a normal HTTP request', async (test) => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = configureAxios({url: 'http://example.com'});
  const response = await alpha.get('/some/path');

  test.is(response.data, 'hello!');
  test.is(response.status, 200);

  test.deepEqual(
    response.headers,
    { 'test-header': 'some value' }
  );

  test.true(server.isDone());
});

test.serial('Making a GET request with the https protocol performs a normal HTTPS request', async (test) => {
  const server = nock('https://example.com')
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = configureAxios({url: 'https://example.com'});
  const response = await alpha.get('/some/path');

  test.is(response.data, 'hello!');
  test.is(response.status, 200);

  test.deepEqual(
    response.headers,
    { 'test-header': 'some value' }
  );

  test.true(server.isDone());
});
