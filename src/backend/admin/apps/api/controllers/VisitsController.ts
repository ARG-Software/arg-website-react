import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import { createErrorBody } from '../../../../shared/api/http.js';
import { adminContainer } from '../../di/adminContainer.js';
import { getClientIp, getHeaderGeolocation } from '../../http/requestInfo.js';
import { ControllerBase } from './ControllerBase.js';

export class VisitsController extends ControllerBase {
  constructor(private readonly visits = adminContainer.visits) {
    super();
  }

  @route('POST', '/api/visit-log')
  @errorResponse('visit_log_failed', 'Unable to log visit')
  async log(request: Request): Promise<Response> {
    try {
      const payload = await this.body(request);
      await this.visits.recordVisitSessionUseCase.execute({
        clientIp: getClientIp(request),
        fallbackGeo: getHeaderGeolocation(request),
        sessionId: payload.sessionId,
        events: payload.events,
        pageViews: payload.pageViews,
        language: payload.language,
        referrer: payload.referrer,
      });

      return this.json(204, '');
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'rate_limited') {
        return this.json(
          429,
          createErrorBody('rate_limited', 'Too many requests. Please try again later.')
        );
      }

      throw error;
    }
  }

  @route('GET', '/api/admin/visit-metrics')
  @errorResponse('visit_metrics_request_failed', 'Admin request failed')
  async metrics(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.visits.listVisitMetricsUseCase.execute(this.query(request)));
  }

  @route('GET', '/api/admin/visit-sessions')
  @errorResponse('visit_sessions_request_failed', 'Admin request failed')
  async sessions(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.visits.listVisitSessionsUseCase.execute(this.query(request)));
  }

  @route('GET', '/api/admin/visit-journey')
  @errorResponse('visit_journey_request_failed', 'Admin request failed')
  async journey(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.visits.listVisitJourneyUseCase.execute(this.query(request)));
  }

}

let controller: VisitsController;

export function getVisitRoutes() {
  controller ||= new VisitsController();
  return getControllerRoutes(controller);
}
