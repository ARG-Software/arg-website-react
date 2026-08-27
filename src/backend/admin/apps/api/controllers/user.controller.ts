import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { adminContainer } from '../../di/admin.container.js';
import { getAccessToken } from '../../http/usersession.cookies.js';
import { ControllerBase } from './controllerbase.js';

export class UserController extends ControllerBase {
  constructor(
    private readonly users = adminContainer.users,
    logger?: ILogger
  ) {
    super(logger);
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
  controller ||= new UserController(adminContainer.users, adminContainer.logger);
  return getControllerRoutes(controller);
}
