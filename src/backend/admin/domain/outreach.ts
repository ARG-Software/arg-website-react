import { OutreachDomainError } from './errors/OutreachDomainError.js';
import type {
  OutreachConstructorParams,
  OutreachContactMethod,
  OutreachStatus,
  OutreachSummary,
} from './types/OutreachTypes.js';

const OUTREACH_STATUSES: readonly OutreachStatus[] = ['sent', 'not_sent'];
const OUTREACH_CONTACT_METHODS: readonly OutreachContactMethod[] = ['email', 'contact_form'];

export class Outreach {
  readonly id?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly companyName: string;
  readonly contactEmail: string;
  readonly emailSubject: string;
  readonly emailBody: string;
  readonly website: string;
  readonly contactInfo: string;
  readonly contactMethod: OutreachContactMethod;
  readonly fitReason: string;
  readonly status: OutreachStatus;
  readonly dateSent: string;
  readonly followUpDate: string;
  readonly replyObtained: boolean;
  readonly replySummary: string;
  readonly notes: string;

  constructor(params: OutreachConstructorParams) {
    this.id = params.id;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.companyName = params.companyName;
    this.website = params.website || '';
    this.contactEmail = params.contactEmail || '';
    this.contactInfo = params.contactInfo || '';
    this.contactMethod = this.normalizeContactMethod(params.contactMethod);
    this.fitReason = params.fitReason || '';
    this.emailSubject = params.emailSubject || '';
    this.emailBody = params.emailBody || '';
    this.status = this.normalizeStatus(params.status);
    this.dateSent = params.dateSent || '';
    this.followUpDate = params.followUpDate || '';
    this.replyObtained = Boolean(params.replyObtained);
    this.replySummary = params.replySummary || '';
    this.notes = params.notes || '';
    this.validate();
  }

  static createSummary(records: Outreach[]): OutreachSummary {
    return records.reduce(
      (summary, record) => {
        summary.total += 1;

        if (record.status === 'sent') {
          summary.sent += 1;
          if (record.replyObtained) {
            summary.repliesObtained += 1;
          } else {
            summary.sentWithoutReply += 1;
          }
        } else {
          summary.notSent += 1;
        }

        return summary;
      },
      { total: 0, sent: 0, notSent: 0, repliesObtained: 0, sentWithoutReply: 0 }
    );
  }

  update(record: Outreach): Outreach {
    const canUpdateSentFields = this.status !== 'sent';

    const next: OutreachConstructorParams = {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      companyName: record.companyName,
      website: record.website,
      contactEmail: record.contactEmail,
      contactInfo: record.contactInfo,
      contactMethod: canUpdateSentFields ? record.contactMethod : this.contactMethod,
      fitReason: record.fitReason,
      emailSubject: record.emailSubject,
      emailBody: record.emailBody,
      status: canUpdateSentFields ? record.status : this.status,
      dateSent: canUpdateSentFields ? record.dateSent : this.dateSent,
      followUpDate: record.followUpDate,
      replyObtained: record.replyObtained,
      replySummary: record.replySummary,
      notes: record.notes,
    };

    if (next.status === 'sent' && !next.dateSent) {
      next.dateSent = new Date().toISOString().slice(0, 10);
    }

    return new Outreach(next);
  }

  private validate(): void {
    if (!this.companyName) throw OutreachDomainError.missingCompanyName();
    if (!this.isStatus(this.status)) throw OutreachDomainError.invalidStatus();
    if (!this.isContactMethod(this.contactMethod)) throw OutreachDomainError.invalidContactMethod();
    if (this.status === 'sent' && !this.dateSent) throw OutreachDomainError.missingSentDate();
  }

  private isStatus(value: string): value is OutreachStatus {
    return OUTREACH_STATUSES.includes(value as OutreachStatus);
  }

  private isContactMethod(value: string): value is OutreachContactMethod {
    return OUTREACH_CONTACT_METHODS.includes(value as OutreachContactMethod);
  }

  private normalizeStatus(value: OutreachStatus | string): OutreachStatus {
    if (!this.isStatus(value)) throw OutreachDomainError.invalidStatus();

    return value;
  }

  private normalizeContactMethod(value: OutreachContactMethod | string): OutreachContactMethod {
    if (!this.isContactMethod(value)) throw OutreachDomainError.invalidContactMethod();

    return value;
  }
}
