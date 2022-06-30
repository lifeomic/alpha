const { Alpha } = require('../src');
const AWS = require('aws-sdk-mock');
const nock = require('nock');

beforeAll(() => nock.disableNetConnect());
afterAll(() => nock.enableNetConnect());

let ctx;
beforeEach(() => {
  ctx = {};
  ctx.alpha = new Alpha();
  ctx.invoke = jest.fn();
  AWS.mock('Lambda', 'invoke', ctx.invoke);
});

afterEach(() => {
  AWS.restore();
  nock.cleanAll();
});

test('A Lambda can redirect to HTTP', async () => {
  const server = nock('http://example.com')
    .get('/')
    .reply(200, 'we made it alive!');

  ctx.invoke
    .mockImplementation((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          headers: { location: 'http://example.com' },
          statusCode: 302,
        }),
      });
    });

  const response = await ctx.alpha.get('lambda://test');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(server.isDone()).toBe(true);
});

test('A Lambda can redirect to a relative URL', async () => {
  ctx.invoke
    .mockImplementationOnce((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          headers: { location: '/some/path' },
          statusCode: 302,
        }),
      });
    })
    .mockImplementationOnce((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          body: 'we made it alive!',
          statusCode: 200,
        }),
      });
    })
    .mockImplementationOnce((req, cb) => {
      cb(new Error('off the deep end!'));
    });

  const response = await ctx.alpha.get('lambda://test');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(ctx.invoke).toBeCalledTimes(2);
});

test('A Lambda can redirect to a qualified Lambda URL', async () => {
  ctx.invoke
    .mockImplementationOnce((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          headers: { location: 'lambda://test:deployed/some/path' },
          statusCode: 302,
        }),
      });
    })
    .mockImplementationOnce((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          body: 'we made it alive!',
          statusCode: 200,
        }),
      });
    });

  const response = await ctx.alpha.get('lambda://test');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(ctx.invoke).toBeCalledTimes(2);
});

test('An HTTP endpoint can redirect to a Lambda', async () => {
  const server = nock('http://example.com')
    .get('/')
    .reply(302, null, { location: 'lambda://test' });
  ctx.invoke
    .mockImplementation((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          body: 'we made it alive!',
          statusCode: 200,
        }),
      });
    });

  const response = await ctx.alpha.get('http://example.com');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(server.isDone()).toBe(true);
});

test('Redirects are limited by default', async () => {
  const server = nock('http://example.com')
    .get('/').reply(302, null, { location: '/one' })
    .get('/one').reply(302, null, { location: '/two' })
    .get('/two').reply(302, null, { location: '/three' })
    .get('/three').reply(302, null, { location: 'lambda://test/one' });
  ctx.invoke
    .mockImplementationOnce((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          headers: { location: '/two' },
          statusCode: 302,
        }),
      });
    })
    .mockImplementationOnce((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          headers: { location: '/three' },
          statusCode: 302,
        }),
      });
    })
    .mockImplementationOnce((req, cb) => {
      cb(new Error('off the deep end!'));
    });

  const promise = ctx.alpha.get('http://example.com');
  await expect(promise).rejects.toThrow('Exceeded maximum number of redirects.');
  const error = await promise.catch((error) => error);

  expect(error.config.url).toBe('lambda://test/two');
  expect(error.response.status).toBe(302);
  expect(error.response.headers.location).toBe('/three');
  expect(server.isDone()).toBe(true);
});

test('Redirects can be explicitly limited', async () => {
  const server = nock('http://example.com')
    .get('/').reply(302, null, { location: '/one' })
    .get('/one').reply(302, null, { location: '/two' })
    .get('/two').reply(302, null, { location: 'lambda://test/one' });

  ctx.invoke
    .mockImplementationOnce((req, cb) => {
      cb(null, {
        StatusCode: 200,
        Payload: JSON.stringify({
          headers: { location: '/two' },
          statusCode: 302,
        }),
      });
    })
    .mockImplementationOnce(() => {})
    .mockImplementationOnce((cb) => {
      cb(new Error('off the deep end!'));
    });

  const promise = ctx.alpha.get('http://example.com', { maxRedirects: 3 });
  await expect(promise).rejects.toThrow('Exceeded maximum number of redirects.');
  const error = await promise.catch((error) => error);

  expect(error.config.url).toBe('lambda://test/one');
  expect(error.response.status).toBe(302);
  expect(error.response.headers.location).toBe('/two');
  expect(server.isDone()).toBe(true);
});
