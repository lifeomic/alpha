import { InvocationResponse, InvokeCommand, Lambda } from '@aws-sdk/client-lambda';
import { AwsClientStub } from 'aws-sdk-client-mock/dist/types/awsClientStub';

export interface PrepResponse extends Omit<InvocationResponse, 'Payload'> {
  Payload?: Record<string, any>
}

export const prepResponse = (
  {
    Payload: payload,
    ...responseOpts
  }: PrepResponse,
): InvocationResponse => {
  const Payload = payload ? Buffer.from(JSON.stringify(payload)) as Uint8Array : undefined;
  return {
    ...responseOpts,
    Payload,
  };
};

export const createResponse = (
  mockLambda: AwsClientStub<Lambda>,
  input: PrepResponse,
) => {
  const response = prepResponse(input);
  mockLambda.on(InvokeCommand).resolves(response);
};
