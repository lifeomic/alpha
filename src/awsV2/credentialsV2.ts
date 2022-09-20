import { config } from 'aws-sdk';
import { Credentials, Provider } from '@aws-sdk/types';
import { CredentialsOptions } from 'aws-sdk/lib/credentials';

export const credentialsProvider: Provider<Credentials> = async () =>
  new Promise<Credentials | CredentialsOptions>((resolve) => {
    config.getCredentials((err, credentials) => {
      if (credentials) {
        resolve(credentials);
      } else {
        resolve({
          accessKeyId: '',
          secretAccessKey: '',
        });
      }
    });
  });
