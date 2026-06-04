import { Lambda } from '@aws-sdk/client-lambda';
import { captureAWSv3Client, setContextMissingStrategy } from 'aws-xray-sdk-core';

/**
 * Whether X-Ray tracing is active in the current runtime.
 *
 * AWS injects `_X_AMZN_TRACE_ID` into any Lambda execution environment that has
 * active tracing, so its presence is a reliable signal that there is a live
 * segment to attach to. Consumers can also force-enable instrumentation via
 * `ALPHA_XRAY_TRACING=true` (e.g. for a non-Lambda runtime that manages its own
 * segments).
 *
 * Outside of these cases (local dev, tests, untraced runtimes) we deliberately
 * leave alpha's Lambda client untouched: alpha is a published library used
 * everywhere, and wrapping an untraced client would emit context-missing errors
 * on every invoke. The default behavior for an untraced caller must be
 * unchanged.
 */
const isXRayTracingActive = (): boolean =>
  Boolean(process.env._X_AMZN_TRACE_ID) || process.env.ALPHA_XRAY_TRACING === 'true';

// Only soften the context-missing strategy once, and never more than once.
let contextMissingConfigured = false;

/**
 * Wrap alpha's Lambda client with X-Ray so that each `lambda://` invoke emits a
 * subsegment naming the downstream Lambda (the target service), with trace
 * header propagation. This lights up internal service -> service edges in the
 * X-Ray service graph.
 *
 * `captureAWSv3Client` adds middleware to and returns the *same* client
 * instance, so `lambda.destroy()` and the `config.Lambda` injection escape
 * hatch keep working transparently against the returned client.
 *
 * Safety for untraced consumers is the priority here:
 *  - We only wrap when X-Ray is actually active (see `isXRayTracingActive`).
 *  - If the consumer has not pinned `AWS_XRAY_CONTEXT_MISSING`, we set the
 *    strategy to `LOG_ERROR` so a missing segment logs rather than throws. We
 *    never clobber a consumer's explicit choice (env var set, or their own
 *    `setContextMissingStrategy` call before any invoke).
 *  - Any failure while instrumenting falls back to the original, unwrapped
 *    client so tracing can never break a real invoke.
 */
export const captureLambdaClient = (lambda: Lambda): Lambda => {
  if (!isXRayTracingActive()) {
    return lambda;
  }

  try {
    if (!contextMissingConfigured && !process.env.AWS_XRAY_CONTEXT_MISSING) {
      setContextMissingStrategy('LOG_ERROR');
      contextMissingConfigured = true;
    }
    return captureAWSv3Client(lambda);
  } catch {
    // Never let tracing instrumentation break a real invoke.
    return lambda;
  }
};
