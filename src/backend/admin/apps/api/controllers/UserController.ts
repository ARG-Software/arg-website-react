import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import { adminContainer } from '../../di/adminContainer.js';
import { getAccessToken } from '../../http/userSessionCookies.js';
import { ControllerBase } from './ControllerBase.js';

export class UserController extends ControllerBase {
  constructor(private readonly users = adminContainer.users) {
    super();
  }

  @route('PATCH', '/api/admin/user')
  @errorResponse('admin_user_update_failed', 'User update failed')
  async update(request: Request): Promise<Response> {
    const accessToken = getAccessToken(request);
    const user = await this.authenticateUser(request);
    const payload = await this.body(request, { fallback: {}, trimStrings: false });
    const result = await this.users.updateUserUseCase.execute({
      accessToken,
      user,
      name: payload.name,
      password: payload.password,
    });

    return this.json(200, result);
  }
}

let controller: UserController;

export function getUserRoutes() {
  controller ||= new UserController();
  return getControllerRoutes(controller);
}
