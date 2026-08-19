import { createAltchaChallenge, verifyAltchaChallenge, verifyAltchaPayload } from '../../infrastructure/security/altcha.js';
import { checkRateLimits, getRateLimitConfig } from '../../infrastructure/security/rateLimit.js';
import { SupabaseRateLimitStore } from '../../infrastructure/security/rateLimitStores.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';
import { getSupabaseConfig } from '../../infrastructure/repositories/supabase/supabaseConfig.js';
import type { EnvSource } from '../../config/env.js';

interface GasparSecurityAppOptions {
  env?: EnvSource;
}

export function createGasparHumanVerificationApp({
  env = process.env,
}: GasparSecurityAppOptions = {}) {
  return {
    createChallenge() {
      return createAltchaChallenge(env);
    },
    verifyChallenge(payload: Parameters<typeof verifyAltchaChallenge>[0]) {
      return verifyAltchaChallenge(payload, env);
    },
    verifyPayload(payload: string) {
      return verifyAltchaPayload(payload, env);
    },
  };
}

export function createGasparAskRateLimiterApp({ env = process.env }: GasparSecurityAppOptions = {}) {
  const store = new SupabaseRateLimitStore(createSupabaseServiceClient(getSupabaseConfig(env)));
  const config = getRateLimitConfig(env);

  return {
    check(ip: string) {
      return checkRateLimits(ip, store, config);
    },
  };
}
