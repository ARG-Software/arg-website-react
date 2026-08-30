export type VisitMetricRangeQuery = {
  fromIso?: string | null;
  toIso: string;
};

export type VisitMetricPageViewRecord = {
  sessionHash: string;
  path: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: string | number | null;
};

export type VisitPageViewRecord = {
  sessionHash: string;
  sequence: string | number;
  path: string;
  title: string;
  startedAt: string;
  endedAt: string;
  durationMs: string | number;
};

export interface IVisitPageViewRepository {
  findForMetricRange(query: VisitMetricRangeQuery): Promise<VisitMetricPageViewRecord[]>;
  findBySessionHash(sessionHash: string): Promise<VisitPageViewRecord[]>;
}
