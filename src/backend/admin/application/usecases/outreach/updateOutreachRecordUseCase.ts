import { Outreach } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/OutreachDomainError.js';
import type {
  IOutreachAuditRepository,
  IOutreachRepository,
} from '../../ports/repositories/IOutreachRepository.js';

export interface UpdateOutreachRecordInput {
  id: string;
  record: Outreach;
  actorEmail: string;
}

export interface UpdateOutreachRecordDependencies {
  auditRepository: IOutreachAuditRepository;
  outreachRepository: IOutreachRepository;
}

export async function updateOutreachRecordUseCase(
  input: UpdateOutreachRecordInput,
  { auditRepository, outreachRepository }: UpdateOutreachRecordDependencies
): Promise<Outreach> {
  if (!input.id) {
    throw OutreachDomainError.missingId();
  }

  const record = await outreachRepository.findById(input.id);

  if (!record) {
    throw OutreachDomainError.notFound();
  }

  const nextRecord = record.update(input.record);
  const updatedRecord = await outreachRepository.save(nextRecord);

  await auditRepository.recordUpdated({
    recordId: input.id,
    actorEmail: input.actorEmail,
    changedFields: getChangedFields(record, nextRecord),
  });

  return updatedRecord;
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
