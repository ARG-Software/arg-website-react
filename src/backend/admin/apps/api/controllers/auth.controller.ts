import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import { adminContainer, type AdminContainer } from '../../di/admin.container.js';
import { getClientIp } from '../../../../shared/api/http.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { IWebhookProvider } from '../../../application/ports/iwebhook.provider.js';
import {
  clearUserSessionCookies,
  copyResponseHeaders,
  getAccessToken,
  getRefreshToken,
  setUserSessionCookies,
} from '../../http/usersession.cookies.js';
import { ControllerBase } from './controllerbase.js';

export class AuthController extends ControllerBase {
  constructor(
    private readonly auth: AdminContainer['auth'],
    private readonly loginRateLimitNotifier: IWebhookProvider,
    logger?: ILogger
  ) {
    super(auth.authenticateUserUseCase, logger);
  }

  @route('POST', '/api/admin/login')
  @errorResponse('admin_login_failed', 'Admin login failed')
  async login(request: Request): Promise<Response> {
    try {
      await this.checkRateLimit(request, this.auth.loginRateLimiter);
    } catch (error) {
      const rateLimitError = error as { code?: string };
      if (rateLimitError.code === 'rate_limited') await this.notifyLoginRateLimit(request, error);

      throw error;
    }

    const cookieResponse = new Response(null);
    const payload = await this.body(request, { fallback: {}, trimStrings: false });

    await this.verifyAltchaPayload(payload.altcha, this.auth.altchaSettings);

    const result = await this.auth.loginUserUseCase.execute({
      email: payload.email,
      password: payload.password,
    });

    setUserSessionCookies(
      cookieResponse,
      {
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
      },
      this.auth.secureCookies
    );

    const response = this.json(200, { user: result.user });
    copyResponseHeaders(cookieResponse, response);

    return response;
  }

  private async notifyLoginRateLimit(request: Request, error: any): Promise<void> {
    try {
      await this.loginRateLimitNotifier.send({
        title: 'Admin login rate limit reached',
        description: 'Too many requests hit the admin login endpoint.',
        fields: [
          { name: 'Endpoint', value: '/api/admin/login' },
          { name: 'Client IP', value: getClientIp(request) },
          { name: 'Scope', value: error.limitScope || '-' },
          { name: 'Retry after', value: `${error.retryAfterSeconds || 0}s` },
          { name: 'Origin', value: request.headers.get('origin') || '-' },
          { name: 'User agent', value: request.headers.get('user-agent') || '-' },
        ],
      });
    } catch (notificationError) {
      this.logger?.error('Login rate-limit notification failed', { error: notificationError });
    }
  }

  @route('GET', '/api/admin/session')
  @errorResponse('admin_session_failed', 'Session lookup failed')
  async getSession(request: Request): Promise<Response> {
    const cookieResponse = new Response(null);
    const result = await this.auth.getUserSessionUseCase.execute({
      accessToken: getAccessToken(request),
      refreshToken: getRefreshToken(request),
    });

    if (result.session) {
      setUserSessionCookies(
        cookieResponse,
        {
          accessToken: result.session.access_token,
          refreshToken: result.session.refresh_token,
        },
        this.auth.secureCookies
      );
    }

    const response = this.json(200, { user: result.user });
    copyResponseHeaders(cookieResponse, response);

    return response;
  }

  @route('POST', '/api/admin/session')
  @errorResponse('admin_session_refresh_failed', 'Session refresh failed')
  async refreshSession(request: Request): Promise<Response> {
    const cookieResponse = new Response(null);
    const result = await this.auth.refreshUserSessionUseCase.execute(getRefreshToken(request));

    setUserSessionCookies(
      cookieResponse,
      {
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
      },
      this.auth.secureCookies
    );

    const response = this.json(200, { user: result.user });
    copyResponseHeaders(cookieResponse, response);

    return response;
  }

  @route('DELETE', '/api/admin/session')
  @errorResponse('admin_sign_out_failed', 'Sign out failed')
  async signOut(request: Request): Promise<Response> {
    const cookieResponse = new Response(null);

    await this.auth.signOutUserUseCase.execute(getAccessToken(request));
    clearUserSessionCookies(cookieResponse);

    const response = this.json(204, '');
    copyResponseHeaders(cookieResponse, response);

    return response;
  }
}

let controller: AuthController;

export function getAuthRoutes() {
  controller ||= new AuthController(
    adminContainer.auth,
    adminContainer.loginRateLimitNotifier,
    adminContainer.logger
  );
  return getControllerRoutes(controller);
}
