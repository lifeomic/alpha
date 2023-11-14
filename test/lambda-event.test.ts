import get from 'lodash/get';
import { lambdaEvent } from '../src/adapters/helpers/lambdaEvent';
import { AlphaOptions } from '../src';

const duplicateParams = '/lifeomic/dstu3/Questionnaire?pageSize=25&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fquestionnaire-type%7Csurvey-form&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fdataset%7C0bb18fef-4e2d-4b91-a623-09527265a8b3&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fprimary%7C0343bfcf-4e2d-4b91-a623-095272783bf3';
const params = '/lifeomic/dstu3/Questionnaire?pageSize=25&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fquestionnaire-type%7Csurvey-form&test=diffValue';
const invalidValueParam = '/lifeomic/dstu3/Questionnaire?pageSize=25&=onlyvalue';
const invalidKeyParam = '/lifeomic/dstu3/Questionnaire?pageSize=25&onlyKey=';
const noParams = '/lifeomic/dstu3/Questionnaire';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const lambda = 'lambda://service:deployed/';
const config: AlphaOptions = {
  method: 'get',
  headers: {},
  url: '',
};

const assertRequestId = (eventPayload: Record<string, any>) => {
  const requestId = get(eventPayload, 'requestContext.requestId');
  expect(requestId).toMatch(uuidPattern);
};

test('Can parse URLs with duplicate parameters', () => {
  config.url = lambda + duplicateParams;
  const result = lambdaEvent(config, duplicateParams);
  expect(result).toEqual(expect.objectContaining({
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      _tag: [
        'http://lifeomic.com/fhir/questionnaire-type|survey-form',
        'http://lifeomic.com/fhir/dataset|0bb18fef-4e2d-4b91-a623-09527265a8b3',
        'http://lifeomic.com/fhir/primary|0343bfcf-4e2d-4b91-a623-095272783bf3',
      ],
      pageSize: '25',
    },
  }));
  assertRequestId(result);
});

test('Can parse URLs without duplicates', () => {
  config.url = lambda + params;
  const result = lambdaEvent(config, params);
  expect(result).toEqual(expect.objectContaining({
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      _tag: 'http://lifeomic.com/fhir/questionnaire-type|survey-form',
      pageSize: '25',
      test: 'diffValue',
    },
  }));
  assertRequestId(result);
});

test('handles null values', () => {
  config.url = lambda + invalidKeyParam;
  const result = lambdaEvent(config, invalidKeyParam);
  expect(result).toEqual(expect.objectContaining({
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      pageSize: '25',
      onlyKey: '',
    },
  }));
  assertRequestId(result);
});

test('handles null keys', () => {
  config.url = lambda + invalidValueParam;
  const result = lambdaEvent(config, invalidValueParam);
  expect(result).toEqual(expect.objectContaining({
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      pageSize: '25',
      '': 'onlyvalue',
    },
  }));
});

test('Adds content-type to multiValueHeaders', () => {
  const config: AlphaOptions = {
    data: JSON.stringify({ data: 'test' }),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    url: lambda + noParams,
  };
  const result = lambdaEvent(config, noParams);
  expect(result).toEqual(expect.objectContaining({
    body: JSON.stringify({ data: 'test' }),
    headers: { 'Content-Type': 'application/json' },
    httpMethod: 'POST',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {},
    multiValueHeaders: {
      'Content-Type': ['application/json'],
    },
  }));
  assertRequestId(result);
});
