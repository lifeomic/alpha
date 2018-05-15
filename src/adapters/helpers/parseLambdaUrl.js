// This expression for the funtion name and qualfier was taken from:
// https://docs.aws.amazon.com/lambda/latest/dg/API_CreateFunction.html#SSS-CreateFunction-request-FunctionName
// eslint-disable-next-line security/detect-unsafe-regex
const LAMBDA_URL_PATTERN = new RegExp('^lambda://([a-zA-Z0-9-_]+)(:(\\$LATEST|[a-zA-Z0-9-_]+))?(/.*|$)');

module.exports = (url) => {
  const parts = LAMBDA_URL_PATTERN.exec(url);

  if (!parts) {
    return null;
  }

  return {
    name: parts[1],
    qualifier: parts[3] || '',
    path: parts[4] || ''
  };
};
