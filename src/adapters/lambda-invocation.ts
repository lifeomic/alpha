import { chainAdapters } from './helpers/chainAdapters';
import { AlphaOptions, AlphaAdapter } from '../types';
import { Alpha } from '../alpha';
import { moduleExists } from '../utils/modules';

const awsLambdaSdkV2 = 'aws-sdk/clients/lambda';
const awsLambdaSdkV3 = '@aws-sdk/client-lambda';

const lambdaInvocationAdapter: AlphaAdapter = async (config) => {
  const { awsSdkVersion } = config;
  let invokeLambda: AlphaAdapter | undefined;

  if (awsSdkVersion === 2 || (!awsSdkVersion && await moduleExists(awsLambdaSdkV2))) {
    ({ invokeLambda } = await import('../awsV2/lambdaV2'));
  } else if (awsSdkVersion === 3 || (!awsSdkVersion && await moduleExists(awsLambdaSdkV3))) {
    ({ invokeLambda } = await import('../awsV3/lambdaV3'));
  }

  if (!invokeLambda) {
    throw new Error(`Missing module ${awsLambdaSdkV2} or ${awsLambdaSdkV3}`);
  }

  return invokeLambda(config);
};

const lambdaInvocationRequestInterceptor = (config: AlphaOptions) => {
  return chainAdapters(
    config,
    (config) => (config.url as string).startsWith('lambda:') || (config.baseURL?.startsWith('lambda:')),
    lambdaInvocationAdapter,
  );
};

export const setup = (client: Alpha) => {
  client.interceptors.request.use(lambdaInvocationRequestInterceptor);
};
