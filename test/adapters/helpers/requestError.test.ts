import { isAxiosError, isAlphaRequestError } from '../../../src';

class FakeError {
  isAxiosError = true;
  isAlphaRequestError = true;
}

test('will return if an error isAxiosError', () => {
  expect(isAxiosError({ isAxiosError: true })).toBe(true);

  expect(isAxiosError({ isAxiosError: false })).toBe(false);
  expect(isAxiosError({})).toBe(false);
  expect(isAxiosError('')).toBe(false);
  expect(isAxiosError(123)).toBe(false);
  expect(isAxiosError(true)).toBe(false);
  expect(isAxiosError(FakeError)).toBe(false);
});

test('will return if an error isAlphaRequestError', () => {
  expect(isAlphaRequestError({ isAlphaRequestError: true })).toBe(true);

  expect(isAlphaRequestError({ isAlphaRequestError: false })).toBe(false);
  expect(isAlphaRequestError({})).toBe(false);
  expect(isAlphaRequestError('')).toBe(false);
  expect(isAlphaRequestError(123)).toBe(false);
  expect(isAlphaRequestError(true)).toBe(false);
  expect(isAlphaRequestError(FakeError)).toBe(false);
});
