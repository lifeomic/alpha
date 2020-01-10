import cloneDeep from 'lodash/cloneDeep';
import {AxiosInstance} from 'axios';

import RequestError from '../../utils/RequestError';
import {AlphaConfig} from '../../types';
import {resolveUrl} from '../../utils/urlUtils';


export default (alpha: AxiosInstance) => {
  alpha.interceptors.response.use(async (response) => {
    const config = response.config as AlphaConfig;
    let redirectCount = config.__redirectCount || 0;

    if (response.status === 301 || response.status === 302) {
      if (redirectCount >= config.__maxRedirects!) {
        throw new RequestError('Exceeded maximum number of redirects.', response.config, response.request, response);
      }
      const redirect = cloneDeep(config);
      const location = response.headers.location;
      const currentLocation = resolveUrl(config.url, config.baseURL);
      redirect.baseURL = resolveUrl(location, currentLocation);
      redirect.url = undefined;
      redirect.__redirectCount = redirectCount + 1;
      delete redirect.adapter;
      return alpha.request(redirect);
    }

    return response;
  })
}
