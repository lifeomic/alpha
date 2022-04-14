const { resolve } = require('../src');
const test = require('ava');

test('Resolving a relative URL against a Lambda URL returns a Lambda URL', (test) => {
  const base = 'lambda://user-service';
  const url = 'some/path';

  test.is(resolve(url, base), 'lambda://user-service/some/path');
});

test('Resolving a relative URL against a Lambda URL with a path returns a Lambda URL', (test) => {
  const base = 'lambda://user-service/some/path';
  const url = 'other/path';

  test.is(resolve(url, base), 'lambda://user-service/some/other/path');
});

test('Resolving an absolute URL against a Lambda URL with a path returns a Lambda URL', (test) => {
  const base = 'lambda://user-service/some/path';
  const url = '/some/other/path';

  test.is(resolve(url, base), 'lambda://user-service/some/other/path');
});

test('Resolving a URL against a Lambda URL with a qualifier returns a Lambda URL', (test) => {
  const base = 'lambda://user-service:deployed';
  const url = 'some/path';

  test.is(resolve(url, base), 'lambda://user-service:deployed/some/path');
});

test('Resolving a fully-qualified Lambda URL returns the URL', (test) => {
  const url = 'lambda://user-service:deployed/some/path';
  test.is(resolve(url, 'http://example.com'), url);
});

test('Resolving a URL against an HTTP URL returns an HTTP URL', (test) => {
  const base = 'http://example.com';
  const url = 'some/path';

  test.is(resolve(url, base), 'http://example.com/some/path');
});

test('Resolving against a base URL that is merely a path returns the base path', (test) => {
  const base = '/base/path';
  const url = '/url/path';

  test.is(resolve(url, base), url);
});
