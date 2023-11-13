import { AxiosHeaders } from 'axios';
import { Handler } from 'aws-lambda';
import { v4 as uuid } from 'uuid';

import { Alpha, AlphaOptions } from '../src';

const handler: jest.MockedFn<Handler> = jest.fn();
const config: AlphaOptions = { headers: new AxiosHeaders() };

const response = {
  headers: { 'test-header': 'some value' },
  body: 'hello!',
  statusCode: 200,
};

const expected = {
  data: response.body,
  status: response.statusCode,
  statusText: 'OK',
  headers: response.headers,
};

test('constructor types', () => {
  expect(() => new Alpha()).not.toThrow();
  expect(() => new Alpha('')).not.toThrow();
  expect(() => new Alpha('', config)).not.toThrow();
  expect(() => new Alpha(handler)).not.toThrow();
  expect(() => new Alpha(handler, config)).not.toThrow();
  expect(() => new Alpha(config)).not.toThrow();
});

test('overloaded method signatures', async () => {
  const path = `/${uuid()}`;
  handler.mockResolvedValue(response);
  const options: AlphaOptions = config;
  const data = {};
  const alpha = new Alpha(handler);
  await expect(alpha.get(path, options)).resolves.toEqual(expect.objectContaining(expected));
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path, httpMethod: 'GET' }), expect.any(Object), expect.any(Function));

  await expect(alpha.delete(path, options)).resolves.toEqual(expect.objectContaining(expected));
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path, httpMethod: 'DELETE' }), expect.any(Object), expect.any(Function));

  await expect(alpha.head(path, options)).resolves.toEqual(expect.objectContaining(expected));
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path, httpMethod: 'HEAD' }), expect.any(Object), expect.any(Function));

  await expect(alpha.options(path, options)).resolves.toEqual(expect.objectContaining(expected));
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path, httpMethod: 'OPTIONS' }), expect.any(Object), expect.any(Function));

  await expect(alpha.post(path, data, options)).resolves.toEqual(expect.objectContaining(expected));
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path, httpMethod: 'POST' }), expect.any(Object), expect.any(Function));

  await expect(alpha.put(path, data, options)).resolves.toEqual(expect.objectContaining(expected));
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path, httpMethod: 'PUT' }), expect.any(Object), expect.any(Function));

  await expect(alpha.patch(path, data, options)).resolves.toEqual(expect.objectContaining(expected));
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path, httpMethod: 'PATCH' }), expect.any(Object), expect.any(Function));
});
