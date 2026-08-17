import { createAltchaChallenge, verifyAltchaChallenge, verifyAltchaPayload } from '../../infrastructure/security/altcha.js';
import { checkRateLimits, getRateLimitConfig } from '../../infrastructure/security/rateLimit.js';
import { SupabaseRateLimitStore } from '../../infrastructure/security/rateLimitStores.js';
import { createSupabaseServiceClient } from '../../infrastructure/repositories/supabase/SupabaseClientFactory.js';

export function createGasparHumanVerificationApp() {
  return {
    createChallenge: createAltchaChallenge,
    verifyChallenge: verifyAltchaChallenge,
    verifyPayload: verifyAltchaPayload,
  };
}

export function createGasparAskRateLimiterApp() {
  const store = new SupabaseRateLimitStore(createSupabaseServiceClient());
  const config = getRateLimitConfig();

  return {
    check(ip: string) {
      return checkRateLimits(ip, store, config);
    },
  };
}
