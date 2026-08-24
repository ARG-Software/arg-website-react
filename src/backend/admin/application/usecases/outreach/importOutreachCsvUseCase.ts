import { Outreach, OutreachCsv, type OutreachEncryptionConfig } from '../../../domain/outreach.js';
import { OutreachDomainError } from '../../../domain/errors/OutreachDomainError.js';
import type { IClock } from '../../ports/IClock.js';
import type { IOutreachRepository } from '../../ports/IOutreachRepository.js';

export interface ImportOutreachCsvInput {
  csv: string;
}

export interface ImportOutreachCsvDependencies {
  clock: IClock;
  outreachEncryption: OutreachEncryptionConfig;
  outreachRepository: IOutreachRepository;
}

export async function importOutreachCsvUseCase(
  input: ImportOutreachCsvInput,
  { outreachRepository, clock, outreachEncryption }: ImportOutreachCsvDependencies
): Promise<{ imported: number; records?: Outreach[]; errors: { row: number; error: string }[] }> {
  const { records, errors } = OutreachCsv.parse(input.csv || '', clock.today(), outreachEncryption);

  if (errors.length) {
    return { imported: 0, errors };
  }

  try {
    const createdRecords = await outreachRepository.createMany(records);
    return { imported: createdRecords.length, records: createdRecords, errors: [] };
  } catch (error) {
    if (error instanceof Error && Outreach.isDuplicateError(error)) {
      throw OutreachDomainError.duplicateRecord();
    }

    throw error;
  }
}
