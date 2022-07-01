import { Alpha } from '../src';
import nock from 'nock';
import { InvokeCommand, Lambda } from '@aws-sdk/client-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { createResponse, prepResponse } from './utils';

const mockLambda = mockClient(Lambda);

beforeAll(() => nock.disableNetConnect());
afterAll(() => nock.enableNetConnect());

interface TestContext {
  alpha: Alpha;
}

let ctx: TestContext;
beforeEach(() => {
  ctx = {} as TestContext;
  ctx.alpha = new Alpha();
});

afterEach(() => {
  mockLambda.reset();
  nock.cleanAll();
});

test('A Lambda can redirect to HTTP', async () => {
  const server = nock('http://example.com')
    .get('/')
    .reply(200, 'we made it alive!');

  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      headers: { location: 'http://example.com' },
      statusCode: 302,
    },
  });

  const response = await ctx.alpha.get('lambda://test');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(server.isDone()).toBe(true);
});

test('A Lambda can redirect to a relative URL', async () => {
  mockLambda.on(InvokeCommand)
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        headers: { location: '/some/path' },
        statusCode: 302,
      },
    }))
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        body: 'we made it alive!',
        statusCode: 200,
      },
    }))
    .rejects(new Error('off the deep end!'));

  const response = await ctx.alpha.get('lambda://test');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(mockLambda.commandCalls(InvokeCommand)).toHaveLength(2);
});

test('A Lambda can redirect to a qualified Lambda URL', async () => {
  mockLambda.on(InvokeCommand)
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        headers: { location: 'lambda://test:deployed/some/path' },
        statusCode: 302,
      },
    }))
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        body: 'we made it alive!',
        statusCode: 200,
      },
    }));

  const response = await ctx.alpha.get('lambda://test');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(mockLambda.commandCalls(InvokeCommand)).toHaveLength(2);
});

test('An HTTP endpoint can redirect to a Lambda', async () => {
  const server = nock('http://example.com')
    .get('/')
    .reply(302, undefined, { location: 'lambda://test' });
  createResponse(mockLambda, {
    StatusCode: 200,
    Payload: {
      body: 'we made it alive!',
      statusCode: 200,
    },
  });

  const response = await ctx.alpha.get('http://example.com');

  expect(response.status).toBe(200);
  expect(response.data).toBe('we made it alive!');
  expect(server.isDone()).toBe(true);
});

test('Redirects are limited by default', async () => {
  const server = nock('http://example.com')
    .get('/').reply(302, undefined, { location: '/one' })
    .get('/one').reply(302, undefined, { location: '/two' })
    .get('/two').reply(302, undefined, { location: '/three' })
    .get('/three').reply(302, undefined, { location: 'lambda://test/one' });
  mockLambda.on(InvokeCommand)
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload:{
        headers: { location: '/two' },
        statusCode: 302,
      },
    }))
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        headers: { location: '/three' },
        statusCode: 302,
      },
    }))
    .rejectsOnce(new Error('off the deep end!'));

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
    .get('/').reply(302, undefined, { location: '/one' })
    .get('/one').reply(302, undefined, { location: '/two' })
    .get('/two').reply(302, undefined, { location: 'lambda://test/one' });

  mockLambda.on(InvokeCommand)
    .resolvesOnce(prepResponse({
      StatusCode: 200,
      Payload: {
        headers: { location: '/two' },
        statusCode: 302,
      },
    }))
    .callsFakeOnce(() => {})
    .rejectsOnce(new Error('off the deep end!'));

  const promise = ctx.alpha.get('http://example.com', { maxRedirects: 3 });
  await expect(promise).rejects.toThrow('Exceeded maximum number of redirects.');
  const error = await promise.catch((error) => error);

  expect(error.config.url).toBe('lambda://test/one');
  expect(error.response.status).toBe(302);
  expect(error.response.headers.location).toBe('/two');
  expect(server.isDone()).toBe(true);
});
