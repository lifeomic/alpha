import axios from 'axios';
import { chainAdapters } from '../../../src/adapters/helpers/chainAdapters';
import { AlphaAdapter } from '../../../src';

test('will set default adapter', () => {
  const adapter: AlphaAdapter = jest.fn();
  const defaultAdapter = axios.defaults.adapter = jest.fn();
  const config = chainAdapters(
    {},
    () => false,
    adapter,
  );
  expect(defaultAdapter).not.toBeCalled();
  expect(() => config.adapter!(config)).not.toThrow();
  expect(defaultAdapter).toBeCalled();
  expect(adapter).not.toBeCalled();
});
