import axios, { AxiosHeaders, getAdapter } from 'axios';
import { chainAdapters } from '../../../src/adapters/helpers/chainAdapters';
import { AlphaAdapter } from '../../../src';

test('will set default adapter', async () => {
  const adapter: AlphaAdapter = jest.fn();
  const defaultAdapter = axios.defaults.adapter = jest.fn();
  const config = chainAdapters(
    { headers: new AxiosHeaders() },
    () => false,
    adapter,
  );
  expect(defaultAdapter).not.toHaveBeenCalled();

  expect(config.adapter).toHaveLength(1); // an array of adapters
  await expect(getAdapter(config.adapter)(config)).resolves.toBeUndefined();
  expect(defaultAdapter).toHaveBeenCalled();
  expect(adapter).not.toHaveBeenCalled();
});
