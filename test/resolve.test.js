const { resolve } = require('../src');

test('Resolving a relative URL against a Lambda URL returns a Lambda URL', () => {
  const base = 'lambda://user-service';
  const url = 'some/path';

  expect(resolve(url, base)).toBe('lambda://user-service/some/path');
});

test('Resolving a relative URL against a Lambda URL with a path returns a Lambda URL', () => {
  const base = 'lambda://user-service/some/path';
  const url = 'other/path';

  expect(resolve(url, base)).toBe('lambda://user-service/some/other/path');
});

test('Resolving an absolute URL against a Lambda URL with a path returns a Lambda URL', () => {
  const base = 'lambda://user-service/some/path';
  const url = '/some/other/path';

  expect(resolve(url, base)).toBe('lambda://user-service/some/other/path');
});

test('Resolving a URL against a Lambda URL with a qualifier returns a Lambda URL', () => {
  const base = 'lambda://user-service:deployed';
  const url = 'some/path';

  expect(resolve(url, base)).toBe('lambda://user-service:deployed/some/path');
});

test('Resolving a fully-qualified Lambda URL returns the URL', () => {
  const url = 'lambda://user-service:deployed/some/path';
  expect(resolve(url, 'http://example.com')).toBe(url);
});

test('Resolving a URL against an HTTP URL returns an HTTP URL', () => {
  const base = 'http://example.com';
  const url = 'some/path';

  expect(resolve(url, base)).toBe('http://example.com/some/path');
});

test('Resolving against a base URL that is merely a path returns the base path', () => {
  const base = '/base/path';
  const url = '/url/path';

  expect(resolve(url, base)).toBe(url);
});
