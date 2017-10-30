const Alpha = require('../src/Alpha');
const nock = require('nock');
const test = require('ava');

test.before(() => {
  nock.disableNetConnect();
});

test.after(() => {
  nock.enableNetConnect();
});

test.always.afterEach(() => {
  nock.cleanAll();
});

test.serial('Making a request with retries enabled should succeed if the number of failed requests is less than the number of attempts', async (test) => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = new Alpha('http://example.com', { retry: true });
  const response = await alpha.get('/some/path');

  test.is(response.data, 'hello!');
  test.is(response.status, 200);
  test.true(server.isDone());
});

test.serial('Making a request with retries enabled should fail for an error that is not retryable', async (test) => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(403);

  const alpha = new Alpha('http://example.com', { retry: true });
  const err = await test.throws(alpha.get('/some/path'));
  test.is(err.response.status, 403);

  test.true(server.isDone());
});

test.serial('Making a request with retries enabled should fail when the number of requests exceeds the configured number of attempts', async (test) => {
  const server = nock('http://example.com')
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(503)
    .get('/some/path')
    .reply(200, 'hello!', { 'test-header': 'some value' });

  const alpha = new Alpha('http://example.com', { retry: { attempts: 2 } });
  const err = await test.throws(alpha.get('/some/path'));
  test.is(err.response.status, 503);

  // Should not be done because we exceeded number of attempts
  test.true(!server.isDone());
});
