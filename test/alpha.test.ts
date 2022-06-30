import { Alpha, AlphaOptions } from '../src';
import { Handler } from 'aws-lambda';

const handler: Handler = jest.fn();
const config: AlphaOptions = {};

test('constructor types', () => {
  expect(() => new Alpha()).not.toThrow();
  expect(() => new Alpha('')).not.toThrow();
  expect(() => new Alpha('', config)).not.toThrow();
  expect(() => new Alpha(handler)).not.toThrow();
  expect(() => new Alpha(handler, config)).not.toThrow();
  expect(() => new Alpha(config)).not.toThrow();
});
