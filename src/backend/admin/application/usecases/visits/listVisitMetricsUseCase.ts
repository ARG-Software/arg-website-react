import type { VisitMetricsData } from '../../../domain/types/VisitTypes.js';
import type { IVisitRepository } from '../../ports/repositories/IVisitRepository.js';

const ALLOWED_RANGES = new Set(['7d', '30d', '2m']);

export async function listVisitMetricsUseCase(
  repository: IVisitRepository,
  range: string
): Promise<VisitMetricsData> {
  const normalizedRange = ALLOWED_RANGES.has(range) ? range : '30d';
  const data = await repository.getMetrics(normalizedRange);

  return {
    summary: data.summary || {
      total: 0,
      visits: 0,
      uniqueVisitors: 0,
      today: 0,
      countries: 0,
    },
    points: Array.isArray(data.points) ? data.points : [],
    countryBreakdown: Array.isArray(data.countryBreakdown) ? data.countryBreakdown : [],
    topPages: Array.isArray(data.topPages) ? data.topPages : [],
    topReferrers: Array.isArray(data.topReferrers) ? data.topReferrers : [],
  };
}
