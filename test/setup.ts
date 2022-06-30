import AWS_SDK_MOCK from 'aws-sdk-mock';
import AWS_SDK from 'aws-sdk';

// Force aws-sdk-mock to use the same instance of the SDK that the code uses.
// This is necessary due to transpiling. See
// https://github.com/dwyl/aws-sdk-mock#setting-the-aws-sdk-object-explicitly
AWS_SDK_MOCK.setSDKInstance(AWS_SDK);
