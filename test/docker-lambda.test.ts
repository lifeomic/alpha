import rawProxyquire from 'proxyquire';
import sinon from 'sinon';
import anyTest, {TestInterface} from 'ava';

interface TestContext {
  dockerLambda: sinon.SinonStub;
  Alpha: {
    dockerLambda: Function;
  };
}

const test = anyTest as TestInterface<TestContext>;

const proxyquire = rawProxyquire.noPreserveCache();

test.beforeEach((test) => {
  test.context.dockerLambda = sinon.stub().resolves({
    body: 'test response',
    headers: {},
    statusCode: 200
  });

  test.context.Alpha = proxyquire(
    '../src/index',
    {
      'docker-lambda': test.context.dockerLambda
    }
  );
});

test.serial('A docker-lambda client passes events to the docker wrapper', async (test) => {
  const client = test.context.Alpha.dockerLambda();
  const response = await client.get('/some/path');

  test.is(response.status, 200);
  test.is(response.data, 'test response');

  test.true(test.context.dockerLambda.calledWith({
    event: sinon.match.object,
    taskDir: false
  }));
});

test.serial('A docker-lambda client can configure the docker wrapper', async (test) => {
  const client = test.context.Alpha.dockerLambda({
    dockerArgs: [ '--network', 'foo' ],
    dockerImage: 'test-image',
    handler: 'lib/bar',
    taskDir: '/some/path'
  });

  await client.get('/some/path');

  test.true(test.context.dockerLambda.calledWith({
    dockerArgs: [ '--network', 'foo' ],
    dockerImage: 'test-image',
    event: sinon.match.object,
    handler: 'lib/bar',
    taskDir: '/some/path'
  }));
});

test.serial('A docker-lambda client configuration cannot override the event', async (test) => {
  const client = test.context.Alpha.dockerLambda({ event: 'foo' });

  await client.get('/some/path');

  test.true(test.context.dockerLambda.calledWith({
    event: sinon.match.object,
    taskDir: false
  }));
});

test.serial('A docker-lambda client can configure the underlying Alpha client', async (test) => {
  const client = test.context.Alpha.dockerLambda(
    null,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  await client.post('/some/path');

  test.true(test.context.dockerLambda.calledWith({
    event: sinon.match.object,
    taskDir: false
  }));

  const event = test.context.dockerLambda.firstCall.args[0].event;

  test.is(event.headers['Content-Type'], 'application/json');
});

test.serial('When the docker container fails to launch an error is thrown', async (test) => {
  const failure = new Error('simulated failure');
  test.context.dockerLambda.rejects(failure);

  const client = test.context.Alpha.dockerLambda();
  const error = await test.throwsAsync(() => client.get('/some/path'));

  test.is(error.message, failure.message);
});
