import { matchHost } from '../../src/utils/aws';

test.each`
  host | serviceCode | regionCode
  ${undefined} | ${''} | ${'us-east-1'}
  ${''} | ${''} | ${'us-east-1'}
  ${'s3.amazonaws.com'} | ${'s3'} | ${'us-east-1'}
  ${'lifeomic.s3.amazonaws.com'} | ${'s3'} | ${'us-east-1'}
  ${'lifeomic.s3.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'s3.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'s3-fips.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'s3.dualstack.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'s3-fips.dualstack.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'123456789012.s3-control.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'123456789012.s3-control-fips.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'123456789012.s3-control.dualstack.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'123456789012.s3-control-fips.dualstack.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'s3-fips.dualstack.us-east-1.amazonaws.com'} | ${'s3'} | ${'us-east-1'}
  ${'s3-fips.dualstack.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'s3-fips.dualstack.us-west-1.amazonaws.com'} | ${'s3'} | ${'us-west-1'}
  ${'s3-fips.dualstack.us-west-2.amazonaws.com'} | ${'s3'} | ${'us-west-2'}
  ${'s3-fips.us-east-1.amazonaws.com'} | ${'s3'} | ${'us-east-1'}
  ${'s3-fips.us-east-2.amazonaws.com'} | ${'s3'} | ${'us-east-2'}
  ${'s3-fips.us-west-1.amazonaws.com'} | ${'s3'} | ${'us-west-1'}
  ${'s3-fips.us-west-2.amazonaws.com'} | ${'s3'} | ${'us-west-2'}
  ${'s3-fips.us-gov-east-1.amazonaws.com'} | ${'s3'} | ${'us-gov-east-1'}
  ${'s3-fips.us-gov-west-1.amazonaws.com'} | ${'s3'} | ${'us-gov-west-1'}
  ${'s3-fips.ca-central-1.amazonaws.com'} | ${'s3'} | ${'ca-central-1'}
  ${'search-cluster-name-aaaa00aaaa0aaa0aaaaaaa0aaa.us-east-2.es.amazonaws.com'} | ${'es'} | ${'us-east-2'}
  ${'email.us-east-2.amazonaws.com'} | ${'ses'} | ${'us-east-2'}
`('$# will parse the service and region ($host)', ({ serviceCode, regionCode, host }: { serviceCode: string; regionCode: string; host: string; }) => {
  expect(matchHost(host)).toEqual({ serviceCode, regionCode });
});
