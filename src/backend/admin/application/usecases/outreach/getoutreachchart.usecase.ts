import { Outreach } from '../../../domain/outreach.js';
import type { IClock } from '../../ports/iclock.js';
import type { IOutreachRepository } from '../../ports/repositories/ioutreach.repository.js';

interface OutreachChartPoint {
  label: string;
  sent: number;
  repliesObtained: number;
}

export interface GetOutreachChartInput {
  range?: string;
}

export class GetOutreachChartUseCase {
  constructor(private readonly outreachRepository: IOutreachRepository, private readonly clock: IClock) {}

  async execute(input: GetOutreachChartInput = {}) {
    const records = await this.outreachRepository.list();
    const range = input.range || 'all';
    const now = getClockDate(this.clock);
    const sentRecords = records.filter(record => record.status === 'sent');
    const buckets = createBuckets(range, now, sentRecords);
    const repliesObtained = sentRecords.filter(record => record.replyObtained).length;
    const sentWithoutReply = sentRecords.length - repliesObtained;

    for (const record of sentRecords) {
      const date = parseRecordDate(record);
      const key = getBucketKey(date, buckets.granularity);
      const bucket = buckets.items.get(key);
      if (!bucket) continue;

      bucket.sent += 1;
      if (record.replyObtained) bucket.repliesObtained += 1;
    }

    return {
      range,
      points: [...buckets.items.values()],
      pie: [
        { label: 'Replies obtained', value: repliesObtained },
        { label: 'Sent without reply', value: sentWithoutReply },
      ],
    };
  }
}

function getClockDate(clock: IClock): Date {
  return clock?.today ? new Date(`${clock.today()}T00:00:00.000Z`) : new Date();
}

function parseRecordDate(record: Outreach): Date {
  return new Date(record.dateSent || record.updatedAt || record.createdAt || '');
}

function createBuckets(range: string, now: Date, records: Outreach[]) {
  if (range === '7d') return createDailyBuckets(now, 7);
  if (range === '30d') return createDailyBuckets(now, 30);
  if (range === 'monthly') return createMonthlyBuckets(now, 12);

  return createAllTimeBuckets(records);
}

function createDailyBuckets(now: Date, days: number): { granularity: 'day'; items: Map<string, OutreachChartPoint> } {
  const items = new Map<string, OutreachChartPoint>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = getBucketKey(date, 'day');
    items.set(key, { label: key, sent: 0, repliesObtained: 0 });
  }

  return { granularity: 'day', items };
}

function createMonthlyBuckets(now: Date, months: number): { granularity: 'month'; items: Map<string, OutreachChartPoint> } {
  const items = new Map<string, OutreachChartPoint>();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = getBucketKey(date, 'month');
    items.set(key, { label: key, sent: 0, repliesObtained: 0 });
  }

  return { granularity: 'month', items };
}

function createAllTimeBuckets(records: Outreach[]): { granularity: 'month'; items: Map<string, OutreachChartPoint> } {
  const keys = records
    .map(record => getBucketKey(parseRecordDate(record), 'month'))
    .filter(Boolean)
    .sort();
  const uniqueKeys = keys.length ? [...new Set(keys)] : [getBucketKey(new Date(), 'month')];
  const items = new Map(uniqueKeys.map(key => [key, { label: key, sent: 0, repliesObtained: 0 }]));

  return { granularity: 'month', items };
}

function getBucketKey(date: Date, granularity: 'day' | 'month'): string {
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  if (granularity === 'month') {
    return `${year}-${month}`;
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
