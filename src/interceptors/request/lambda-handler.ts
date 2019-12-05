import {AxiosInstance} from 'axios';
import {AlphaConfig} from '../../types';
import isAbsoluteURL from '../../utils/isAbsoluteURL';
import lambdaHandler from '../../adapters/lambda-handler';
import {resolveUrl} from '../../utils/urlUtils';


export default (alpha: AxiosInstance) => {
  alpha.interceptors.request.use(async (request) => {
    const lambda = (alpha.defaults as AlphaConfig).lambda;
    const url = resolveUrl(request.url, request.baseURL);
    if (!isAbsoluteURL(url) && !!lambda) {
      request.adapter = lambdaHandler;
    }

    return request;
  });
}
