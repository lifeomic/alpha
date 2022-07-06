const hostRegex = /([^.]+)\.(?:dualstack\.)?(?:([^.]*)\.)?amazonaws\.com(\.cn)?$/;

export const matchHost = (host: string | undefined) => {
  const match = (host || '').match(hostRegex);
  const hostParts = (match || []).slice(1, 3);
  let [serviceCode, regionCode] = hostParts;

  // ES's hostParts are sometimes the other way round, if the value that is expected
  // to be region equals ‘es’ switch them back
  // e.g. search-cluster-name-aaaa00aaaa0aaa0aaaaaaa0aaa.us-east-1.es.amazonaws.com
  if (regionCode === 'es') {
    ([serviceCode, regionCode] = [regionCode, serviceCode]);

  } else if (regionCode === 's3') {
    serviceCode = 's3';
    regionCode = 'us-east-1';

  } else if (serviceCode === 'email') {
    serviceCode = 'ses';

  } else if (/^s3-/.test(serviceCode)) {
    serviceCode = 's3';
  }

  return {
    serviceCode: serviceCode ?? '',
    regionCode: regionCode ?? 'us-east-1',
  };
};
