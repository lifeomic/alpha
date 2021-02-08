const Alpha = require('../src/Alpha');
const AWS = require('aws-sdk-mock');
const nock = require('nock');
const sinon = require('sinon');
const test = require('ava');

test.before(() => nock.disableNetConnect());
test.after(() => nock.enableNetConnect());

test.beforeEach((test) => {
  test.context.alpha = new Alpha();
  test.context.invoke = sinon.stub();
  AWS.mock('Lambda', 'invoke', test.context.invoke);
});

test.afterEach.always((test) => {
  AWS.restore();
  nock.cleanAll();
});

test.serial('A Lambda can redirect to HTTP', async (test) => {
  const server = nock('http://example.com')
    .get('/')
    .reply(200, 'we made it alive!');

  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: 'http://example.com' },
      statusCode: 302
    })
  });

  const response = await test.context.alpha.get('lambda://test');

  test.is(response.status, 200);
  test.is(response.data, 'we made it alive!');
  test.true(server.isDone());
});

test.serial('A Lambda can redirect to a relative URL', async (test) => {
  test.context.invoke.onFirstCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/some/path' },
      statusCode: 302
    })
  });

  test.context.invoke.onSecondCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200
    })
  });

  const response = await test.context.alpha.get('lambda://test');

  test.is(response.status, 200);
  test.is(response.data, 'we made it alive!');
  test.true(test.context.invoke.calledTwice);
});

test.serial('A Lambda can redirect to a qualified Lambda URL', async (test) => {
  test.context.invoke.onFirstCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: 'lambda://test:deployed/some/path' },
      statusCode: 302
    })
  });

  test.context.invoke.onSecondCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200
    })
  });

  const response = await test.context.alpha.get('lambda://test');

  test.is(response.status, 200);
  test.is(response.data, 'we made it alive!');
  test.true(test.context.invoke.calledTwice);
});

test.serial('An HTTP endpoint can redirect to a Lambda', async (test) => {
  const server = nock('http://example.com')
    .get('/')
    .reply(302, null, { location: 'lambda://test' });

  test.context.invoke.callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      body: 'we made it alive!',
      statusCode: 200
    })
  });

  const response = await test.context.alpha.get('http://example.com');

  test.is(response.status, 200);
  test.is(response.data, 'we made it alive!');
  test.true(server.isDone());
});

test.serial('Redirects are limited by default', async (test) => {
  const server = nock('http://example.com')
    .get('/').reply(302, null, { location: '/one' })
    .get('/one').reply(302, null, { location: '/two' })
    .get('/two').reply(302, null, { location: '/three' })
    .get('/three').reply(302, null, { location: 'lambda://test/one' });

  test.context.invoke.onFirstCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/two' },
      statusCode: 302
    })
  });

  test.context.invoke.onSecondCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/three' },
      statusCode: 302
    })
  });

  test.context.invoke.onThirdCall().callsArgWith(1, new Error('off the deep end!'));

  const error = await test.throwsAsync(test.context.alpha.get('http://example.com'));

  test.is(error.message, 'Exceeded maximum number of redirects.');
  test.is(error.config.url, 'lambda://test/two');
  test.is(error.response.status, 302);
  test.is(error.response.headers['location'], '/three');
  test.true(server.isDone());
});

test.serial('Redirects can be explicitly limited', async (test) => {
  const server = nock('http://example.com')
    .get('/').reply(302, null, { location: '/one' })
    .get('/one').reply(302, null, { location: '/two' })
    .get('/two').reply(302, null, { location: 'lambda://test/one' });

  test.context.invoke.onFirstCall().callsArgWith(1, null, {
    StatusCode: 200,
    Payload: JSON.stringify({
      headers: { location: '/two' },
      statusCode: 302
    })
  });

  test.context.invoke.onThirdCall().callsArgWith(1, new Error('off the deep end!'));

  const error = await test.throwsAsync(test.context.alpha.get('http://example.com', { maxRedirects: 3 }));

  test.is(error.message, 'Exceeded maximum number of redirects.');
  test.is(error.config.url, 'lambda://test/one');
  test.is(error.response.status, 302);
  test.is(error.response.headers['location'], '/two');
  test.true(server.isDone());
});
