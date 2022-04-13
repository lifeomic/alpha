const test = require('ava');
const get = require('lodash/get');
const { lambdaEvent } = require('../src/adapters/helpers/lambdaEvent');

const duplicateParams = '/lifeomic/dstu3/Questionnaire?pageSize=25&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fquestionnaire-type%7Csurvey-form&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fdataset%7C0bb18fef-4e2d-4b91-a623-09527265a8b3&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fprimary%7C0343bfcf-4e2d-4b91-a623-095272783bf3';
const params = '/lifeomic/dstu3/Questionnaire?pageSize=25&_tag=http%3A%2F%2Flifeomic.com%2Ffhir%2Fquestionnaire-type%7Csurvey-form&test=diffValue';
const invalidValueParam = '/lifeomic/dstu3/Questionnaire?pageSize=25&=onlyvalue';
const invalidKeyParam = '/lifeomic/dstu3/Questionnaire?pageSize=25&onlyKey=';
const noParams = '/lifeomic/dstu3/Questionnaire';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const lambda = `lambda://service:deployed/`;
const config = {
  method: 'get',
  headers: {},
  url: ''
};

function assertRequestId (test, eventPayload) {
  const requestId = get(eventPayload, 'requestContext.requestId');
  test.true(uuidPattern.test(requestId));
}

test.serial(`Can parse URLs with duplicate parameters`, async (test) => {
  config.url = lambda + duplicateParams;
  const result = lambdaEvent(config, duplicateParams);
  test.like(result, {
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      _tag: [
        'http://lifeomic.com/fhir/questionnaire-type|survey-form',
        'http://lifeomic.com/fhir/dataset|0bb18fef-4e2d-4b91-a623-09527265a8b3',
        'http://lifeomic.com/fhir/primary|0343bfcf-4e2d-4b91-a623-095272783bf3'
      ],
      pageSize: '25'
    }
  });
  assertRequestId(test, result);
});

test.serial(`Can parse URLs without duplicates`, async (test) => {
  config.url = lambda + params;
  const result = lambdaEvent(config, params);
  test.like(result, {
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      _tag: 'http://lifeomic.com/fhir/questionnaire-type|survey-form',
      pageSize: '25',
      test: 'diffValue'
    }
  });
  assertRequestId(test, result);
});

test.serial(`handles null values`, test => {
  config.url = lambda + invalidKeyParam;
  const result = lambdaEvent(config, invalidKeyParam);
  test.like(result, {
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      pageSize: '25',
      onlyKey: ''
    }
  });
  assertRequestId(test, result);
});

test.serial(`handles null keys`, test => {
  config.url = lambda + invalidValueParam;
  const result = lambdaEvent(config, invalidValueParam);
  test.like(result, {
    body: '',
    headers: {},
    httpMethod: 'GET',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {
      pageSize: '25',
      '': 'onlyvalue'
    }
  });
});

test.serial(`Adds content-type to multiValueHeaders`, test => {
  const config = {
    data: JSON.stringify({ data: 'test' }),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    url: lambda + noParams
  };
  const result = lambdaEvent(config, noParams);
  test.like(result, {
    body: JSON.stringify({ data: 'test' }),
    headers: { 'Content-Type': 'application/json' },
    httpMethod: 'POST',
    path: '/lifeomic/dstu3/Questionnaire',
    queryStringParameters: {},
    multiValueHeaders: {
      'Content-Type': ['application/json']
    }
  });
  assertRequestId(test, result);
});
