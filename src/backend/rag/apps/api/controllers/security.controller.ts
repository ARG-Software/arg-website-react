import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import { ragContainer } from '../../di/rag.container.js';
import { ControllerBase } from './controllerbase.js';

export class SecurityController extends ControllerBase {
  constructor(private readonly security = ragContainer.security) {
    super();
  }

  @route('GET', '/api/security/challenge')
  @errorResponse('challenge_failed', 'Security verification is temporarily unavailable')
  async challenge(): Promise<Response> {
    return this.json(200, await this.createAltchaChallenge(this.security.altchaSettings));
  }

  @route('POST', '/api/security/verify')
  @errorResponse('verification_failed', 'Verification failed')
  async verify(request: Request): Promise<Response> {
    const payload = await this.body(request);

    await this.verifyAltchaPayload(payload.altcha, this.security.altchaSettings);

    return this.json(200, { verified: true });
  }
}

let controller: SecurityController;

export function getSecurityRoutes() {
  controller ||= new SecurityController();
  return getControllerRoutes(controller);
}
