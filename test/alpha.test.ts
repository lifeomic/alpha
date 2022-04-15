import test from 'ava';
import { Alpha } from '../src';
import sinon from 'sinon';
import { Handler } from 'aws-lambda';
import { AlphaOptions } from '../src/types';

const handler: Handler = sinon.stub();
const config: AlphaOptions = {};

test('constructor types', (t) => {
  t.notThrows(() => new Alpha());
  t.notThrows(() => new Alpha(''));
  t.notThrows(() => new Alpha('', config));
  t.notThrows(() => new Alpha(handler));
  t.notThrows(() => new Alpha(handler, config));
  t.notThrows(() => new Alpha(config));
});
