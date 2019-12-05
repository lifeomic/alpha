import AWS from 'aws-sdk-mock';
import nock from 'nock';
import sinon from 'sinon';
import anyTest, {ExecutionContext, TestInterface} from 'ava';

import configureAxios from '../src';
import {AxiosInstance} from 'axios';
import {LambdaResponse} from '../src/types';
import RequestError from '../src/utils/RequestError';

interface TestContext {
  alpha: AxiosInstance;
  invoke: sinon.SinonStub;
}

const test = anyTest as TestInterface<TestContext>;

test.before(() => nock.disableNetConnect());
test.after(() => nock.enableNetConnect());

test.beforeEach((test) => {
  test.context.alpha = configureAxios();
  test.context.invoke = sinon.stub();
  AWS.mock('Lambda', 'invoke', test.context.invoke);
});

test.afterEach.always((test) => {
  AWS.restore();
  nock.cleanAll();
});

[
  (test: ExecutionContext<TestContext>, url: string) => ({alpha: test.context.alpha, url}),
  (test: ExecutionContext<TestContext>, url: string) => ({alpha: configureAxios({url}), url: ''})
].forEach((configure, idx) => {
  test.serial(`An AlphaLambda can redirect to HTTP ${idx}`, async (test) => {
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
    const {alpha, url} = configure(test, 'lambda://test');
    const response = await alpha.get(url);

    test.is(response.status, 200);
    test.is(response.data, 'we made it alive!');
    test.true(server.isDone());
  });

  test.serial(`An AlphaLambda can redirect to a relative URL ${idx}`, async (test) => {
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

    const {alpha, url} = configure(test, 'lambda://test');
    const response = await alpha.get(url);

    test.is(response.status, 200);
    test.is(response.data, 'we made it alive!');
    test.true(test.context.invoke.calledTwice);
  });

  test.serial(`An AlphaLambda can redirect to a qualified AlphaLambda URL ${idx}`, async (test) => {
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

    const {alpha, url} = configure(test, 'lambda://test');
    const response = await alpha.get(url);

    test.is(response.status, 200);
    test.is(response.data, 'we made it alive!');
    test.true(test.context.invoke.calledTwice);
  });

  test.serial(`An HTTP endpoint can redirect to a AlphaLambda ${idx}`, async (test) => {
    const server = nock('http://example.com')
      .get('/')
      .reply(302, undefined, { location: 'lambda://test' });

    test.context.invoke.callsArgWith(1, null, {
      StatusCode: 200,
      Payload: JSON.stringify({
        body: 'we made it alive!',
        statusCode: 200
      })
    });

    const {alpha, url} = configure(test, 'http://example.com');
    const response = await alpha.get(url);

    test.is(response.status, 200);
    test.is(response.data, 'we made it alive!');
    test.true(server.isDone());
  });

  test.serial(`Redirects are limited by default ${idx}`, async (test) => {
    const server = nock('http://example.com')
      .get('/').reply(302, undefined, { location: '/one' })
      .get('/one').reply(302, undefined, { location: '/two' })
      .get('/two').reply(302, undefined, { location: '/three' })
      .get('/three').reply(302, undefined, { location: 'lambda://test/one' });

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

    const {alpha, url} = configure(test, 'http://example.com');
    const error = await test.throwsAsync<RequestError<unknown, LambdaResponse>>(() => alpha.get(url));

    test.is(error.message, 'Exceeded maximum number of redirects.');
    test.is(error.config.baseURL, 'lambda://test/two');
    test.is(error.response?.status, 302);
    test.is(error.response?.headers['location'], '/three');
    test.true(server.isDone());
  });

  test.serial(`Redirects can be explicitly limited ${idx}`, async (test) => {
    const server = nock('http://example.com')
      .get('/').reply(302, undefined, { location: '/one' })
      .get('/one').reply(302, undefined, { location: '/two' })
      .get('/two').reply(302, undefined, { location: 'lambda://test/one' });

    test.context.invoke.onFirstCall().callsArgWith(1, null, {
      StatusCode: 200,
      Payload: JSON.stringify({
        headers: { location: '/two' },
        statusCode: 302
      })
    });

    test.context.invoke.onSecondCall().callsArgWith(1, new Error('off the deep end!'));

    const {alpha, url} = configure(test, 'http://example.com');
    const error = await test.throwsAsync<RequestError<unknown, LambdaResponse>>(() => alpha.get(url, { maxRedirects: 3 }));

    test.is(error.message, 'Exceeded maximum number of redirects.');
    test.is(error.config.baseURL, 'lambda://test/one');
    test.is(error.response?.status, 302);
    test.is(error.response?.headers['location'], '/two');
    test.true(server.isDone());
  });
});
