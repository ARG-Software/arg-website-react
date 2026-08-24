export class VisitDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;

  private constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'VisitDomainError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static invalidPayload(): VisitDomainError {
    return new VisitDomainError(400, 'invalid_visit_payload', 'Visit payload is required');
  }

  static missingSessionId(): VisitDomainError {
    return new VisitDomainError(400, 'missing_session_id', 'Visit session id is required');
  }

  static missingSessionHash(): VisitDomainError {
    return new VisitDomainError(400, 'missing_session_hash', 'Visit session hash is required');
  }

  static emptyPayload(): VisitDomainError {
    return new VisitDomainError(
      400,
      'empty_visit_payload',
      'Visit payload must include events or page views'
    );
  }

  static invalidPath(): VisitDomainError {
    return new VisitDomainError(400, 'invalid_path', 'Visit path must start with /');
  }

  static invalidSequence(): VisitDomainError {
    return new VisitDomainError(
      400,
      'invalid_sequence',
      'Visit sequence must be a positive integer'
    );
  }
}
