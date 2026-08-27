import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators.js';
import { adminContainer } from '../../di/adminContainer.js';
import { getClientIp } from '../../http/requestInfo.js';
import {
  clearUserSessionCookies,
  copyResponseHeaders,
  getAccessToken,
  getRefreshToken,
  setUserSessionCookies,
} from '../../http/userSessionCookies.js';
import { ControllerBase } from './ControllerBase.js';

export class AuthController extends ControllerBase {
  constructor(private readonly auth = adminContainer.auth) {
    super();
  }

  @route('POST', '/api/admin/login')
  @errorResponse('admin_login_failed', 'Admin login failed')
  async login(request: Request): Promise<Response> {
    const cookieResponse = new Response(null);
    const payload = await this.body(request, { fallback: {}, trimStrings: false });

    await this.verifyAltchaPayload(payload.altcha, this.auth.altchaSettings);

    const result = await this.auth.loginUserUseCase.execute({
      email: payload.email,
      password: payload.password,
      clientIp: getClientIp(request),
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
  controller ||= new AuthController();
  return getControllerRoutes(controller);
}
