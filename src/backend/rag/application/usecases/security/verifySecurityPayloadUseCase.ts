import { createRagError } from '../../errors.js';

export class VerifySecurityPayloadUseCase {
  constructor(
    private readonly humanVerification: {
      verifyPayload(payload: string): Promise<{ verified?: boolean }>;
    }
  ) {}

  async execute(altcha?: unknown): Promise<void> {
    if (!altcha) {
      throw createRagError(403, 'bot_verification_failed', 'Verification required');
    }

    const result = await this.humanVerification.verifyPayload(String(altcha)).catch(() => null);

    if (!result?.verified) {
      throw createRagError(403, 'bot_verification_failed', 'Verification failed');
    }
  }
}
