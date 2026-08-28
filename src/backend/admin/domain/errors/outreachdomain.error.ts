export class OutreachDomainError extends Error {
  readonly code: string;

  private constructor(code: string, message: string) {
    super(message);
    this.name = 'OutreachDomainError';
    this.code = code;
  }

  static missingId(): OutreachDomainError {
    return new OutreachDomainError('missing_id', 'Record id is required');
  }

  static notFound(): OutreachDomainError {
    return new OutreachDomainError('not_found', 'Outreach record not found');
  }

  static missingCompanyName(): OutreachDomainError {
    return new OutreachDomainError('missing_company_name', 'Company name is required');
  }

  static invalidStatus(): OutreachDomainError {
    return new OutreachDomainError('invalid_status', 'Unsupported outreach status');
  }

  static invalidContactMethod(): OutreachDomainError {
    return new OutreachDomainError('invalid_contact_method', 'Unsupported contact method');
  }

  static invalidSort(): OutreachDomainError {
    return new OutreachDomainError('invalid_sort', 'Unsupported sort field');
  }

  static missingSentDate(): OutreachDomainError {
    return new OutreachDomainError('missing_sent_date', 'Sent records require a sent date');
  }

  static sentStatusLocked(): OutreachDomainError {
    return new OutreachDomainError('sent_status_locked', 'Sent outreach status cannot be changed');
  }

  static sentContactMethodLocked(): OutreachDomainError {
    return new OutreachDomainError(
      'sent_contactMethod_locked',
      'Sent outreach contact method cannot be changed'
    );
  }

  static sentDateSentLocked(): OutreachDomainError {
    return new OutreachDomainError('sent_dateSent_locked', 'Sent outreach date cannot be changed');
  }

  static duplicateRecord(): OutreachDomainError {
    return new OutreachDomainError(
      'duplicate_record',
      'Company name or contact email already exists'
    );
  }

  static tooManyRows(): OutreachDomainError {
    return new OutreachDomainError('too_many_rows', 'CSV import supports up to 30 rows');
  }

}
