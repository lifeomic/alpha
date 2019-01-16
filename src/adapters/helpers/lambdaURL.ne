@{%
const flattenDeep = require('lodash/flattenDeep');
const get = require('lodash/get');
%}

# Lambda URLs
lambdaURL -> "lambda://" anyName (":" qualifier):? path:? {%
  (data) => ({
      name: flattenDeep(data[1]).join(''),
      qualifier: flattenDeep(get(data, '[2][1]',  [])).join(''),
      path: flattenDeep(get(data, '[3]',  [])).join('')
  })
%}
anyName -> functionName
            | partialArnName
            | fullArnName
path -> "/" .:*

# This expression for the funtion name and qualfier was taken from:
# https://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-FunctionName
functionName -> [a-zA-Z0-9-_]:+
qualifier -> "$LATEST" | [a-zA-Z0-9-_]:+
accountId -> [0-9]:+
region -> [a-zA-Z0-9-_]:+
partialArnName -> accountId ":function:" functionName
fullArnName -> "arn:aws:lambda:" region ":" partialArnName
