import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { adminContainer, type AdminContainer } from '../../di/admin.container.js';
import { ControllerBase } from './controllerbase.js';

export class ArchitectReleasesController extends ControllerBase {
  constructor(
    private readonly architectReleases: AdminContainer['architectReleases'],
    authenticateUserUseCase: AdminContainer['auth']['authenticateUserUseCase'],
    logger?: ILogger
  ) {
    super(authenticateUserUseCase, logger);
  }

  @route('GET', '/api/architect-releases')
  @errorResponse('architect_releases_request_failed', 'Unable to load architect releases')
  async publicList(request: Request): Promise<Response> {
    const query = this.query(request);

    return this.json(
      200,
      await this.architectReleases.listArchitectReleasesUseCase.execute({
        page: query.page,
        pageSize: query.pageSize || 100,
      })
    );
  }

  @route('GET', '/api/admin/architect-releases')
  @errorResponse('admin_architect_releases_request_failed', 'Admin request failed')
  async list(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(
      200,
      await this.architectReleases.listArchitectReleasesUseCase.execute(this.query(request))
    );
  }

  @route('POST', '/api/admin/architect-releases/sync')
  @errorResponse('admin_architect_releases_sync_failed', 'Unable to fetch architect releases')
  async sync(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.architectReleases.syncArchitectReleasesUseCase.execute());
  }
}

let controller: ArchitectReleasesController;

export function getArchitectReleaseRoutes() {
  controller ||= new ArchitectReleasesController(
    adminContainer.architectReleases,
    adminContainer.auth.authenticateUserUseCase,
    adminContainer.logger
  );

  return getControllerRoutes(controller);
}
