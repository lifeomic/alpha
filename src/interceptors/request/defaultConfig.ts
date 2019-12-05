import {AxiosInstance} from 'axios';
import {AlphaConfig} from '../../types';


export default (alpha: AxiosInstance) => {
  alpha.interceptors.request.use(async (request) => {
    const config = request as AlphaConfig;
    const defaults = alpha.defaults as AlphaConfig;

    if (!('__maxRedirects' in config)) {
      config.__maxRedirects = config.maxRedirects !== undefined ? config.maxRedirects : 5;
    }
    config.maxRedirects = 0;
    config.retry = config.retry || defaults.retry;
    config.lambda = config.lambda || defaults.lambda;
    config.Lambda = config.Lambda || defaults.Lambda;

    return request;
  });
}
