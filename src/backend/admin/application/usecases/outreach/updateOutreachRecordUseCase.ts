import { Outreach, type OutreachChanges } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/OutreachDomainError.js';
import type { IClock } from '../../ports/IClock.js';
import type { IOutreachAuditRepository, IOutreachRepository } from '../../ports/IOutreachRepository.js';

export interface UpdateOutreachRecordInput {
  id: string;
  changes: OutreachChanges;
  actorEmail: string;
}

export interface UpdateOutreachRecordDependencies {
  auditRepository: IOutreachAuditRepository;
  clock: IClock;
  outreachRepository: IOutreachRepository;
}

export async function updateOutreachRecordUseCase(
  input: UpdateOutreachRecordInput,
  { auditRepository, clock, outreachRepository }: UpdateOutreachRecordDependencies
): Promise<Outreach> {
  if (!input.id) {
    throw OutreachDomainError.missingId();
  }

  const record = await outreachRepository.findById(input.id);

  if (!record) {
    throw OutreachDomainError.notFound();
  }

  record.update({ changes: input.changes, today: clock.today() });
  const updatedRecord = await outreachRepository.save(record);

  await auditRepository.recordUpdated({
    recordId: input.id,
    actorEmail: input.actorEmail,
    changedFields: Outreach.getChangedFields(input.changes),
  });

  return updatedRecord;
}
