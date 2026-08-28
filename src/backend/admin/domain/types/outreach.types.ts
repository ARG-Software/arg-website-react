export type OutreachStatus = 'sent' | 'not_sent';
export type OutreachContactMethod = 'email' | 'contact_form';

export type OutreachConstructorParams = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  companyName: string;
  website?: string;
  contactEmail?: string;
  contactInfo?: string;
  contactMethod: OutreachContactMethod;
  fitReason?: string;
  emailSubject?: string;
  emailBody?: string;
  status: OutreachStatus;
  dateSent?: string;
  followUpDate?: string;
  replyObtained?: boolean;
  replySummary?: string;
  notes?: string;
};

export type OutreachSummary = {
  total: number;
  sent: number;
  notSent: number;
  repliesObtained: number;
  sentWithoutReply: number;
};
