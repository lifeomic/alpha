const { parseLambdaUrl } = require('../../src/utils/parseLambdaUrl');
const test = require('ava');

test('Parsing an invalid URL returns null', (test) => {
  test.is(parseLambdaUrl('http://example.com'), null);
});

test('Parsing an invalid ARN URL returns null', (test) => {
  // The ARN as a typo in the 'function' segment
  test.is(parseLambdaUrl('lambda://arn:aws:lambda:us-west-2:123456789012:func:user-service'), null);
});

test('Parsing an invalid partial ARN URL returns null', (test) => {
  // The ARN as a typo in the 'function' segment
  test.is(parseLambdaUrl('lambda://123456789012:func:user-service'), null);
});

const NAME_STYLES = [
  {
    description: 'function ARN',
    name: 'arn:aws:lambda:us-west-2:123456789012:function:user-service'
  },
  {
    description: 'partial function ARN',
    name: '123456789012:function:user-service'
  },
  {
    description: 'function name',
    name: 'user-service'
  }
];

for (const { name, description } of NAME_STYLES) {
  test(`Can parse URLs with ${description}s`, test => {
    test.deepEqual(parseLambdaUrl(`lambda://${name}`), {
      name,
      qualifier: '',
      path: ''
    });
  });

  test(`Can parse URLs with ${description}s and a qualifier`, test => {
    test.deepEqual(parseLambdaUrl(`lambda://${name}:deployed`), {
      name,
      qualifier: 'deployed',
      path: ''
    });
  });

  test(`Can parse URLs with ${description}s, a qualifier and a path`, test => {
    test.deepEqual(parseLambdaUrl(`lambda://${name}:deployed/some/path`), {
      name,
      qualifier: 'deployed',
      path: '/some/path'
    });
  });

  test(`Can parse URLs with ${description}s, a $LATEST qualifier and a path`, test => {
    test.deepEqual(parseLambdaUrl(`lambda://${name}:$LATEST/some/path`), {
      name,
      qualifier: '$LATEST',
      path: '/some/path'
    });
  });

  test(`Can parse ${description}s and a path`, test => {
    test.deepEqual(parseLambdaUrl(`lambda://${name}/some/path`), {
      name,
      qualifier: '',
      path: '/some/path'
    });
  });
}
