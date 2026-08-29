import { errorResponse, getControllerRoutes, route } from '../../../../shared/api/decorators/index.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { adminContainer } from '../../di/admin.container.js';
import { ControllerBase } from './controllerbase.js';

export class OutreachController extends ControllerBase {
  constructor(
    private readonly outreachUseCases = adminContainer.outreach,
    logger?: ILogger
  ) {
    super(logger);
  }

  @route('GET', '/api/admin/outreach-records')
  @errorResponse('admin_outreach_records_failed', 'Admin request failed')
  async records(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(
      200,
      await this.outreachUseCases.listOutreachRecordsUseCase.execute(this.query(request))
    );
  }

  @route('GET', '/api/admin/outreach-summary')
  @errorResponse('admin_outreach_summary_failed', 'Admin request failed')
  async summary(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.outreachUseCases.getOutreachSummaryUseCase.execute());
  }

  @route('GET', '/api/admin/outreach-chart')
  @errorResponse('admin_outreach_chart_failed', 'Admin request failed')
  async chart(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(
      200,
      await this.outreachUseCases.getOutreachChartUseCase.execute(this.query(request))
    );
  }

  @route('GET', '/api/admin/outreach-record')
  @errorResponse('admin_outreach_record_failed', 'Admin request failed')
  async record(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return this.json(200, await this.outreachUseCases.getOutreachRecordUseCase.execute(this.query(request)));
  }

  @route('GET', '/api/admin/outreach-export')
  @errorResponse('admin_outreach_export_failed', 'Admin request failed')
  async exportCsv(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    return createCsvResponse(await this.outreachUseCases.createOutreachCsvUseCase.execute());
  }

  @route('POST', '/api/admin/outreach-import')
  @errorResponse('admin_outreach_import_failed', 'Admin request failed')
  async importCsv(request: Request): Promise<Response> {
    await this.authenticateUser(request);

    const payload = await this.body(request);

    return this.json(200, await this.outreachUseCases.importOutreachCsvUseCase.execute(payload));
  }

  @route('PATCH', '/api/admin/outreach-record')
  @errorResponse('admin_outreach_update_failed', 'Admin request failed')
  async update(request: Request): Promise<Response> {
    const user = await this.authenticateUser(request);
    const payload = await this.body(request);

    return this.json(
      200,
      await this.outreachUseCases.updateOutreachRecordUseCase.execute({
        id: payload.id,
        record: payload.record,
        actorEmail: user.email,
      })
    );
  }
}

let controller: OutreachController;

export function getOutreachRoutes() {
  controller ||= new OutreachController(adminContainer.outreach, adminContainer.logger);
  return getControllerRoutes(controller);
}

function createCsvResponse(csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="outreach-records.csv"',
    },
  });
}
