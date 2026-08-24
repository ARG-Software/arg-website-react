export class OutreachDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;

  private constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'OutreachDomainError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static missingId(): OutreachDomainError {
    return new OutreachDomainError(400, 'missing_id', 'Record id is required');
  }

  static notFound(): OutreachDomainError {
    return new OutreachDomainError(404, 'not_found', 'Outreach record not found');
  }

  static missingCompanyName(): OutreachDomainError {
    return new OutreachDomainError(400, 'missing_company_name', 'Company name is required');
  }

  static invalidStatus(): OutreachDomainError {
    return new OutreachDomainError(400, 'invalid_status', 'Unsupported outreach status');
  }

  static invalidContactMethod(): OutreachDomainError {
    return new OutreachDomainError(
      400,
      'invalid_contact_method',
      'Unsupported contact method'
    );
  }

  static invalidSort(): OutreachDomainError {
    return new OutreachDomainError(400, 'invalid_sort', 'Unsupported sort field');
  }

  static missingSentDate(): OutreachDomainError {
    return new OutreachDomainError(400, 'missing_sent_date', 'Sent records require a sent date');
  }

  static sentFieldLocked(field: string, label: string): OutreachDomainError {
    return new OutreachDomainError(
      400,
      `sent_${field}_locked`,
      `Sent outreach records cannot change ${label}`
    );
  }

  static duplicateRecord(): OutreachDomainError {
    return new OutreachDomainError(
      409,
      'duplicate_record',
      'Company name or contact email already exists'
    );
  }

  static tooManyRows(): OutreachDomainError {
    return new OutreachDomainError(400, 'too_many_rows', 'CSV import supports up to 30 rows');
  }

  static missingEncryptionKey(version: number): OutreachDomainError {
    return new OutreachDomainError(
      503,
      'missing_outreach_encryption_key',
      `Missing outreach encryption key for version ${version}`
    );
  }

  static invalidEncryptionKey(version: number): OutreachDomainError {
    return new OutreachDomainError(
      503,
      'invalid_outreach_encryption_key',
      `Outreach encryption key version ${version} must decode to 32 bytes`
    );
  }

  static missingBlindIndexKey(): OutreachDomainError {
    return new OutreachDomainError(
      503,
      'missing_outreach_blind_index_key',
      'Missing outreach blind index key'
    );
  }
}
