import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Credentials, Provider } from '@aws-sdk/types';

export const credentialsProvider: Provider<Credentials> = defaultProvider();
