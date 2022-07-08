import { setup as awsV4Signature } from './aws-v4-signature';
import { Alpha } from '../alpha';

export const interceptors: ((client: Alpha) => void)[] = [
  awsV4Signature, // Should always be last
];
