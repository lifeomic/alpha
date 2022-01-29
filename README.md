# alpha

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/lifeomic/alpha.svg?branch=master)](https://travis-ci.org/lifeomic/alpha)
[![Coverage Status](https://coveralls.io/repos/github/lifeomic/alpha/badge.svg?branch=master)](https://coveralls.io/github/lifeomic/alpha?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/lifeomic/alpha.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/lifeomic/alpha/badge.svg?targetFile=package.json)](https://snyk.io/test/github/lifeomic/alpha?targetFile=package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/lifeomic/alpha)

Alpha is a module that provides a single client interface for interacting with
HTTP micro-services regardless of whether they are implemented as Lambda
functions or real HTTP servers.

## API

`Alpha` instances are [`axios`][axios] clients at their core. This means that they
support the full `axios` API. The difference is how `Alpha` instances are
instantiated. Regardless of how an `Alpha` instance is instantiated, requests
to fully qualified HTTP URLs will _always_ perform a real HTTP request. Requests
made to Lambda functions with a `Buffer` payload will automatically encode the
request body using the base64 encoding.

### `new Alpha(target)`

Creates a new `Alpha` instances. All `Alpha` instances support the full
[`axios`][axios] API.

#### HTTP Targets

When an `Alpha` instance is created with an HTTP(S) base URL target, requests to
unqualified URLs will be relative to the base URL. For example, the following
code will dispatch the request to `http://example.com/some/path`.

```javascript
const alpha = new Alpha('http://example.com');
const response = await alpha.get('/some/path');
```

#### Lambda Function Targets

When an `Alpha` instance is created with a base URL using the `lambda` scheme,
requests to unqualified URLs will cause the specified [Lambda function][lambda]
to be invoked with a synthetic [API Gateway][api-gateway] event using the
optional [Lambda alias][lambda-alias]. For example, the following code will
invoke the `test-function` Lambda function with the `named-alias`.

```javascript
const alpha = new Alpha('lambda://test-function:named-alias');
const response = await alpha.get('/some/path');
```

The `lambda` URL scheme is interpreted according to the following pattern:

```xml
    lambda://<function-name>:<named-alias>
```

#### Lambda Handler Targets

When an `Alpha` instance is created with a handler function target, requests to
unqualified URLs will be transformed into synthetic [API Gateway (v1)][api-gateway]
events that will be passed directly to the handler function. This is primarily
used for unit testing Lambda handlers.

```javascript
const alpha = new Alpha(handlerFunction);
const response = await alpha.get('/some/path');
```

### Request Retries

An `Alpha` client can be configured to retry a failed attempt. A retryable failure
currently means a request that failed from a network error or had a `5xx` status
code.

```javascript
// Retry failed requests using default settings
const alpha = new Alpha('http://example.com', { retry: true });
```

```javascript
// Retry failed requests using custom settings
const alpha = new Alpha('http://example.com', { retry: {
    attempts: 3,        // The number of attempts to make (default 3)
    factor: 2,          // The factor to use for the exponential backoff delay (default 2)
    maxTimeout: 10000,  // The max timeout in milliseconds to delay before the next attempt (default 10000)
    retryCondition: function (error) { } // If function result is truthy, the error will be retried (default is retry network and 5xx errors)
  });
```

#### Mocking Lambda

To redirect the Lambda requests to a mocked implementation, set the
`LAMBDA_ENDPOINT` environment variable.  The value of this environment variable
will be used when creating the AWS Lambda client.

### `Alpha.dockerLambda(options, clientOptions)`

Creates an `Alpha` client instance that dispatches requests to
[`docker-lambda`][docker-lambda]. This facilitates testing Lambda services in a
full mock Lambda environment running in a docker container. The `options` are
passed to the [`docker-lambda`][docker-lambda] library and the `clientOptions`
configure the `Alpha` client instance that is created.

[api-gateway]: https://aws.amazon.com/documentation/apigateway/ "AWS API Gateway"
[axios]: https://github.com/mzabriskie/axios "Axios"
[docker-lambda]: https://github.com/lambci/docker-lambda "docker-lambda"
[lambda]: https://aws.amazon.com/documentation/lambda/ "AWS Lambda"
[lambda-alias]: https://docs.aws.amazon.com/lambda/latest/dg/versioning-aliases.html "AWS Lambda Versioning / Aliases"
