import {AxiosInstance} from 'axios';

import retry from './retry';
import redirect from './redirect';

export default (alpha: AxiosInstance) => {
  redirect(alpha);
  retry(alpha);
}
