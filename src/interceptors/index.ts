import request from './request';
import response from './response';
import {AxiosInstance} from 'axios';

export default (alpha: AxiosInstance) => {
  request(alpha);
  response(alpha);
}
