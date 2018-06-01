const parseLambdaUrl = require('../src/adapters/helpers/parseLambdaUrl');
const test = require('ava');

test('Parsing an invalid URL returns null', (test) => {
  test.is(parseLambdaUrl('http://example.com'), null);
});

test('Parsing a simple URL returns the function name', (test) => {
  test.deepEqual(
    parseLambdaUrl('lambda://user-service'),
    {
      name: 'user-service',
      qualifier: '',
      path: ''
    }
  );
});

test('Parsing a URL with a path returns the function name and path', (test) => {
  test.deepEqual(
    parseLambdaUrl('lambda://user-service/some/path'),
    {
      name: 'user-service',
      qualifier: '',
      path: '/some/path'
    }
  );
});

test('Parsing a URL with a qualifier returns the function name and qualifier', (test) => {
  test.deepEqual(
    parseLambdaUrl('lambda://user-service:deployed'),
    {
      name: 'user-service',
      qualifier: 'deployed',
      path: ''
    }
  );
});

test('Parsing a URL with a qualifier and path returns the function name, qualifier, and path', (test) => {
  test.deepEqual(
    parseLambdaUrl('lambda://user-service:$LATEST/some/path'),
    {
      name: 'user-service',
      qualifier: '$LATEST',
      path: '/some/path'
    }
  );
});
