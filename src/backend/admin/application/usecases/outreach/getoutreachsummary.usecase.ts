import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

export class GetOutreachSummaryUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository) {}

  async execute() {
    const records = await this.outreachRepository.list();
    const sent = records.filter(record => record.status === 'sent').length;
    const repliesObtained = records.filter(
      record => record.status === 'sent' && record.replyObtained
    ).length;

    return {
      summary: {
        total: records.length,
        sent,
        notSent: records.length - sent,
        repliesObtained,
        sentWithoutReply: sent - repliesObtained,
      },
    };
  }
}
