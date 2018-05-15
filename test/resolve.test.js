const Alpha = require('../src/Alpha');
const test = require('ava');

test('Resolving a relative URL against a Lambda URL returns a Lambda URL', (test) => {
  const base = 'lambda://user-service';
  const url = 'some/path';

  test.is(Alpha.resolve(url, base), 'lambda://user-service/some/path');
});

test('Resolving a relative URL against a Lambda URL with a path returns a Lambda URL', (test) => {
  const base = 'lambda://user-service/some/path';
  const url = 'other/path';

  test.is(Alpha.resolve(url, base), 'lambda://user-service/some/other/path');
});

test('Resolving an absolute URL against a Lambda URL with a path returns a Lambda URL', (test) => {
  const base = 'lambda://user-service/some/path';
  const url = '/some/other/path';

  test.is(Alpha.resolve(url, base), 'lambda://user-service/some/other/path');
});

test('Resolving a URL against a Lambda URL with a qualifier returns a Lambda URL', (test) => {
  const base = 'lambda://user-service:deployed';
  const url = 'some/path';

  test.is(Alpha.resolve(url, base), 'lambda://user-service:deployed/some/path');
});

test('Resolving a fully-qualified Lambda URL returns the URL', (test) => {
  const url = 'lambda://user-service:deployed/some/path';
  test.is(Alpha.resolve(url, 'http://example.com'), url);
});

test('Resolving a URL against an HTTP URL returns an HTTP URL', (test) => {
  const base = 'http://example.com';
  const url = 'some/path';

  test.is(Alpha.resolve(url, base), 'http://example.com/some/path');
});
