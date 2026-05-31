import { setGoogleAuthEnv } from './google-auth';
import { setGoogleSessionEnv } from './google-session';

type RuntimeLocals = {
  runtime?: {
    env?: Record<string, string | undefined>;
  };
};

export function setGoogleRuntimeEnv(locals: RuntimeLocals | undefined) {
  const env = locals?.runtime?.env;
  setGoogleAuthEnv(env);
  setGoogleSessionEnv(env);
}
