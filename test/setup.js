const AWS = require('aws-sdk-mock');

// Force aws-sdk-mock to use the same instance of the SDK that the code uses.
// This is necessary due to transpiling. See
// https://github.com/dwyl/aws-sdk-mock#setting-the-aws-sdk-object-explicitly
AWS.setSDKInstance(require('aws-sdk'));
