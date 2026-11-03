import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseRepositoryBase } from '../../../../shared/infrastructure/repositories/supabase/supabaserepositorybase.js';
import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  ArchitectReleaseListQuery,
  ArchitectReleaseListResult,
  IArchitectReleaseRepository,
} from '../../../application/ports/repositories/iarchitectrelease.repository.js';
import type { ArchitectRelease } from '../../../domain/types/architectrelease.types.js';

type ArchitectReleaseRow = {
  id: string;
  github_id: string;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
};

export class SupabaseArchitectReleaseRepository
  extends SupabaseRepositoryBase
  implements IArchitectReleaseRepository
{
  constructor(
    private readonly client: SupabaseClient,
    private readonly logger?: ILogger
  ) {
    super();
  }

  async list({ page, pageSize }: ArchitectReleaseListQuery): Promise<ArchitectReleaseListResult> {
    return logOperation(
      this.logger,
      'Supabase architect releases query',
      { table: 'architect_releases', page, pageSize },
      async () => {
        const { from, to } = this.getPageRange(page, pageSize);
        const { data, error, count } = await this.client
          .from('architect_releases')
          .select('id, github_id, tag_name, name, body, html_url, published_at', { count: 'exact' })
          .order('published_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        return {
          records: (data || []).map(toArchitectRelease),
          totalRecords: count || 0,
        };
      },
      result => ({ recordCount: result.records.length, totalRecords: result.totalRecords })
    );
  }

  async upsertMany(releases: ArchitectRelease[]): Promise<number> {
    return logOperation(
      this.logger,
      'Supabase architect releases upsert',
      { table: 'architect_releases', recordCount: releases.length },
      async () => {
        const { error } = await this.client.from('architect_releases').upsert(
          releases.map(release => ({
            github_id: release.githubId,
            tag_name: release.tagName,
            name: release.name,
            body: release.body,
            html_url: release.htmlUrl,
            published_at: release.publishedAt,
          })),
          { onConflict: 'github_id' }
        );

        if (error) throw error;

        return releases.length;
      }
    );
  }
}

function toArchitectRelease(row: ArchitectReleaseRow): ArchitectRelease {
  return {
    id: row.id,
    githubId: row.github_id,
    tagName: row.tag_name,
    name: row.name,
    body: row.body,
    htmlUrl: row.html_url,
    publishedAt: row.published_at,
  };
}
