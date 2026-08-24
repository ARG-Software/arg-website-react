export class VisitDomainError extends Error {
  readonly code: string;

  private constructor(code: string, message: string) {
    super(message);
    this.name = 'VisitDomainError';
    this.code = code;
  }

  static missingSessionId(): VisitDomainError {
    return new VisitDomainError('missing_session_id', 'Visit session id is required');
  }

  static emptyPayload(): VisitDomainError {
    return new VisitDomainError(
      'empty_visit_payload',
      'Visit payload must include events or page views'
    );
  }

}
