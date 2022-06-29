import test from 'ava';

import { isAxiosError, isAlphaRequestError } from '../../../src';

class FakeError {
  isAxiosError = true;
  isAlphaRequestError = true;
}

test('will return if an error isAxiosError', (t) => {
  t.true(isAxiosError({ isAxiosError: true }));

  t.false(isAxiosError({ isAxiosError: false }));
  t.false(isAxiosError({}));
  t.false(isAxiosError(''));
  t.false(isAxiosError(123));
  t.false(isAxiosError(true));
  t.false(isAxiosError(FakeError));
});

test('will return if an error isAlphaRequestError', (t) => {
  t.true(isAlphaRequestError({ isAlphaRequestError: true }));

  t.false(isAlphaRequestError({ isAlphaRequestError: false }));
  t.false(isAlphaRequestError({}));
  t.false(isAlphaRequestError(''));
  t.false(isAlphaRequestError(123));
  t.false(isAlphaRequestError(true));
  t.false(isAlphaRequestError(FakeError));
});
