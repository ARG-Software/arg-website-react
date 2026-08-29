import {
  errorResponse,
  getControllerRoutes,
  route,
} from '../../../../shared/api/decorators/index.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { adminContainer, type AdminContainer } from '../../di/admin.container.js';
import { getHeaderGeolocation } from '../../http/requestinfo.js';
import { ControllerBase } from './controllerbase.js';

export class VisitsController extends ControllerBase {
  constructor(
    private readonly visits: AdminContainer['visits'],
    authenticateUserUseCase: AdminContainer['auth']['authenticateUserUseCase'],
    logger?: ILogger
  ) {
    super(authenticateUserUseCase, logger);
  }

  @route('POST', '/api/visit-log')
  @errorResponse('visit_log_failed', 'Unable to log visit')
  async log(request: Request): Promise<Response> {
    await this.checkRateLimit(request, this.visits.visitLogRateLimiter);

    const payload = await this.body(request);
    await this.visits.recordVisitSessionUseCase.execute({
      geo: getHeaderGeolocation(request),
      sessionId: payload.sessionId,
      events: payload.events,
      pageViews: payload.pageViews,
      language: payload.language,
      referrer: payload.referrer,
      attribution: payload.attribution,
    });

    return this.json(204, '');
  }

  @route('GET', '/api/admin/visit-metrics')
  @errorResponse('visit_metrics_request_failed', 'Admin request failed')
  async metrics(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.visits.listVisitMetricsUseCase.execute(this.query(request)));
  }

  @route('GET', '/api/admin/visit-country-breakdown')
  @errorResponse('visit_country_breakdown_request_failed', 'Admin request failed')
  async countryBreakdown(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(
      200,
      await this.visits.listVisitCountryBreakdownUseCase.execute(this.query(request))
    );
  }

  @route('GET', '/api/admin/visit-sessions')
  @errorResponse('visit_sessions_request_failed', 'Admin request failed')
  async sessions(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.visits.listVisitSessionsUseCase.execute(this.query(request)));
  }

  @route('GET', '/api/admin/all-visit-sessions')
  @errorResponse('all_visit_sessions_request_failed', 'Admin request failed')
  async allSessions(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(
      200,
      await this.visits.listAllVisitSessionsUseCase.execute(this.query(request))
    );
  }

  @route('GET', '/api/admin/visit-journey')
  @errorResponse('visit_journey_request_failed', 'Admin request failed')
  async journey(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.visits.listVisitJourneyUseCase.execute(this.query(request)));
  }

  @route('DELETE', '/api/admin/visit-session')
  @errorResponse('visit_session_delete_failed', 'Admin delete request failed')
  async delete(request: Request): Promise<Response> {
    await this.authenticateUser(request);
    await this.visits.deleteVisitSessionUseCase.execute(this.query(request));

    return this.json(204, '');
  }
}

let controller: VisitsController;

export function getVisitRoutes() {
  controller ||= new VisitsController(
    adminContainer.visits,
    adminContainer.auth.authenticateUserUseCase,
    adminContainer.logger
  );
  return getControllerRoutes(controller);
}
