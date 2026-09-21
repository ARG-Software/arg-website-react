import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { adminContainer, type AdminContainer } from '../../di/admin.container.js';
import { ControllerBase } from './controllerbase.js';

export class SocialPostsController extends ControllerBase {
  constructor(
    private readonly socialPosts: AdminContainer['socialPosts'],
    authenticateUserUseCase: AdminContainer['auth']['authenticateUserUseCase'],
    logger?: ILogger
  ) {
    super(authenticateUserUseCase, logger);
  }

  @route('GET', '/api/social-posts')
  @errorResponse('social_posts_request_failed', 'Unable to load social posts')
  async publicList(request: Request): Promise<Response> {
    const query = this.query(request);

    return this.json(
      200,
      await this.socialPosts.listSocialPostsUseCase.execute({
        page: query.page,
        pageSize: query.pageSize || 3,
      })
    );
  }

  @route('GET', '/api/admin/social-posts')
  @errorResponse('admin_social_posts_request_failed', 'Admin request failed')
  async list(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.socialPosts.listSocialPostsUseCase.execute(this.query(request)));
  }

  @route('POST', '/api/admin/social-posts/sync')
  @errorResponse('admin_social_posts_sync_failed', 'Unable to sync social posts')
  async sync(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.socialPosts.syncSocialPostsUseCase.execute());
  }
}

let controller: SocialPostsController;

export function getSocialPostRoutes() {
  controller ||= new SocialPostsController(
    adminContainer.socialPosts,
    adminContainer.auth.authenticateUserUseCase,
    adminContainer.logger
  );

  return getControllerRoutes(controller);
}
