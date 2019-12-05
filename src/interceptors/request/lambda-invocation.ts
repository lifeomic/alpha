import {AxiosInstance} from 'axios';
import lambdaInvocation from '../../adapters/lambda-invocation';


export default (alpha: AxiosInstance) => {
  alpha.interceptors.request.use(async (request) => {
    const url = `${request.baseURL || ''}${request.url || ''}`;
    if (url.startsWith('lambda:')) {
      request.adapter = lambdaInvocation;
    }

    return request;
  });
}
