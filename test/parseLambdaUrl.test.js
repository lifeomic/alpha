const { parseLambdaUrl } = require('../src/adapters/helpers/parseLambdaUrl');

test('Parsing an invalid URL returns null', () => {
  expect(parseLambdaUrl('http://example.com')).toBe(null);
});

test('Parsing an invalid ARN URL returns null', () => {
  // The ARN as a typo in the 'function' segment
  expect(parseLambdaUrl('lambda://arn:aws:lambda:us-west-2:123456789012:func:user-service')).toBeNull();
});

test('Parsing an invalid partial ARN URL returns null', () => {
  // The ARN as a typo in the 'function' segment
  expect(parseLambdaUrl('lambda://123456789012:func:user-service')).toBeNull();
});

const NAME_STYLES = [
  {
    description: 'function ARN',
    name: 'arn:aws:lambda:us-west-2:123456789012:function:user-service',
  },
  {
    description: 'gov cloud function ARN',
    name: 'arn:aws-us-gov:lambda:us-west-2:123456789012:function:user-service',
  },
  {
    description: 'partial function ARN',
    name: '123456789012:function:user-service',
  },
  {
    description: 'function name',
    name: 'user-service',
  },
];

for (const { name, description } of NAME_STYLES) {
  test(`Can parse URLs with ${description}s`, () => {
    expect(parseLambdaUrl(`lambda://${name}`)).toEqual({
      name,
      qualifier: '',
      path: '',
    });
  });

  test(`Can parse URLs with ${description}s and a qualifier`, () => {
    expect(parseLambdaUrl(`lambda://${name}:deployed`)).toEqual({
      name,
      qualifier: 'deployed',
      path: '',
    });
  });

  test(`Can parse URLs with ${description}s, a qualifier and a path`, () => {
    expect(parseLambdaUrl(`lambda://${name}:deployed/some/path`)).toEqual({
      name,
      qualifier: 'deployed',
      path: '/some/path',
    });
  });

  test(`Can parse URLs with ${description}s, a $LATEST qualifier and a path`, () => {
    expect(parseLambdaUrl(`lambda://${name}:$LATEST/some/path`)).toEqual({
      name,
      qualifier: '$LATEST',
      path: '/some/path',
    });
  });

  test(`Can parse URLs with ${description}s, a $LATEST qualifier and a path and a query string`, () => {
    expect(parseLambdaUrl(`lambda://${name}:$LATEST/some/path?key1=value1`)).toEqual({
      name,
      qualifier: '$LATEST',
      path: '/some/path?key1=value1',
    });
  });

  test(`Can parse ${description}s and a path`, () => {
    expect(parseLambdaUrl(`lambda://${name}/some/path`)).toEqual({
      name,
      qualifier: '',
      path: '/some/path',
    });
  });

  test(`Can parse ${description}s and a path and a query string with multiple params`, () => {
    expect(
      parseLambdaUrl(`lambda://${name}/some/path?key1=value1&key2=value2&key3=value3`),
    ).toEqual({
      name,
      qualifier: '',
      path: '/some/path?key1=value1&key2=value2&key3=value3',
    });
  });
}
