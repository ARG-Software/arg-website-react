import { Outreach } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/OutreachDomainError.js';
import type {
  IOutreachAuditRepository,
  IOutreachRepository,
} from '../../ports/repositories/IOutreachRepository.js';
import type { OutreachConstructorParams } from '../../../domain/types/OutreachTypes.js';

export interface UpdateOutreachRecordInput {
  id: string;
  record: Outreach | OutreachConstructorParams;
  actorEmail: string;
}

export class UpdateOutreachRecordUseCase {
  constructor(
    private readonly auditRepository: IOutreachAuditRepository,
    private readonly outreachRepository: IOutreachRepository
  ) {}

  async execute(input: UpdateOutreachRecordInput): Promise<{ record: Outreach }> {
    if (!input.id) {
      throw OutreachDomainError.missingId();
    }

    const record = await this.outreachRepository.findById(input.id);

    if (!record) {
      throw OutreachDomainError.notFound();
    }

    const nextRecord = record.update(
      input.record instanceof Outreach ? input.record : new Outreach(input.record)
    );
    const updatedRecord = await this.outreachRepository.save(nextRecord);

    await this.auditRepository.recordUpdated({
      recordId: input.id,
      actorEmail: input.actorEmail,
      changedFields: getChangedFields(record, nextRecord),
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
