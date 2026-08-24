import { VisitMetrics, type VisitMetricsData } from '../../../domain/visit.js';
import type { IVisitRepository } from '../../ports/IVisitRepository.js';

const ALLOWED_RANGES = new Set(['7d', '30d', '2m']);

export async function listVisitMetricsUseCase(
  repository: IVisitRepository,
  range: string
): Promise<VisitMetricsData> {
  const normalizedRange = ALLOWED_RANGES.has(range) ? range : '30d';
  const data = await repository.getMetrics(normalizedRange);

  return new VisitMetrics(data).toResponse();
}
