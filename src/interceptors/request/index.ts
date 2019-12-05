import {AxiosInstance} from 'axios';

import defaultConfig from './defaultConfig';
import lambdaHandler from './lambda-handler';
import lambdaInvocation from './lambda-invocation';

export default (alpha: AxiosInstance) => {
  defaultConfig(alpha);
  lambdaHandler(alpha);
  lambdaInvocation(alpha);
}
