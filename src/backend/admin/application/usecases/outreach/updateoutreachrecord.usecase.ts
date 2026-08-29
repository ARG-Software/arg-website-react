import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { Outreach } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/outreachdomain.error.js';
import type {
  IOutreachAuditRepository,
  IOutreachRepository,
} from '../../ports/repositories/ioutreach.repository.js';
import type { OutreachConstructorParams } from '../../../domain/types/outreach.types.js';

export interface UpdateOutreachRecordInput {
  id: string;
  record: Outreach | OutreachConstructorParams;
  actorEmail: string;
}

export class UpdateOutreachRecordUseCase {
  constructor(
    private readonly auditRepository: IOutreachAuditRepository,
    private readonly outreachRepository: IOutreachRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: UpdateOutreachRecordInput): Promise<{ record: Outreach }> {
    if (!input.id) {
      this.logger?.warn('Outreach record update rejected', { reason: 'missing_id' });
      throw OutreachDomainError.missingId();
    }

    this.logger?.info('Outreach record update started', { outreachId: input.id });
    const record = await this.outreachRepository.findById(input.id);

    if (!record) {
      this.logger?.warn('Outreach record update rejected', { reason: 'not_found', outreachId: input.id });
      throw OutreachDomainError.notFound();
    }

    const nextRecord = record.update(
      input.record instanceof Outreach ? input.record : new Outreach(input.record)
    );
    const changedFields = getChangedFields(record, nextRecord);
    const updatedRecord = await this.outreachRepository.save(nextRecord);

    await this.auditRepository.recordUpdated({
      recordId: input.id,
      actorEmail: input.actorEmail,
      changedFields,
    });

    this.logger?.info('Outreach record update completed', {
      outreachId: input.id,
      changedFields,
    });

    return { record: updatedRecord };
  }
}

function getChangedFields(current: Outreach, next: Outreach): string[] {
  const fields: string[] = [];

  if (current.companyName !== next.companyName) fields.push('companyName');
  if (current.website !== next.website) fields.push('website');
  if (current.contactEmail !== next.contactEmail) fields.push('contactEmail');
  if (current.contactInfo !== next.contactInfo) fields.push('contactInfo');
  if (current.contactMethod !== next.contactMethod) fields.push('contactMethod');
  if (current.fitReason !== next.fitReason) fields.push('fitReason');
  if (current.emailSubject !== next.emailSubject) fields.push('emailSubject');
  if (current.emailBody !== next.emailBody) fields.push('emailBody');
  if (current.status !== next.status) fields.push('status');
  if (current.dateSent !== next.dateSent) fields.push('dateSent');
  if (current.followUpDate !== next.followUpDate) fields.push('followUpDate');
  if (current.replyObtained !== next.replyObtained) fields.push('replyObtained');
  if (current.replySummary !== next.replySummary) fields.push('replySummary');
  if (current.notes !== next.notes) fields.push('notes');

  return fields;
}
