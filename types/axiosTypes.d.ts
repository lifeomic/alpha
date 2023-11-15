declare module 'axios/unsafe/core/transformData.js' {
  import { AxiosRequestConfig } from 'axios';

  type TransformData = (
    data: AxiosRequestConfig['data'],
    headers: AxiosRequestConfig['headers'],
    fns: AxiosRequestConfig['transformResponse'] | AxiosRequestConfig['transformRequest'],
  ) => string;

  const transformData: TransformData;

  export default transformData;
}

declare module 'axios/unsafe/core/buildFullPath.js' {
  import { AxiosRequestConfig } from 'axios';
  type BuildFullPath = (
    baseURL: AxiosRequestConfig['baseURL'],
    requestedURL: AxiosRequestConfig['url'],
  ) => string;

  const buildFullPath: BuildFullPath;

  export default buildFullPath;
}

declare module 'axios/unsafe/helpers/buildURL.js' {
  import { AxiosRequestConfig } from 'axios';
  type BuildURL = (
    path: string,
    params: AxiosRequestConfig['params'],
    paramsSerializer: AxiosRequestConfig['paramsSerializer'],
  ) => string;

  const buildURL: BuildURL;

  export default buildURL;
}
