import type { ILogger } from '../../../shared/logger/ilogger.js';
import { logOperation } from '../../../shared/logger/logoperation.js';
import { createAdminError } from '../../application/errors.js';
import type {
  GitHubRelease,
  IGitHubReleasesProvider,
  ListGitHubReleasesInput,
} from '../../application/ports/igithubreleases.provider.js';

const GITHUB_API_URL = 'https://api.github.com';
const RELEASES_PAGE_SIZE = 100;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

type GitHubReleaseResponse = {
  id?: number;
  tag_name?: string | null;
  name?: string | null;
  body?: string | null;
  html_url?: string | null;
  published_at?: string | null;
  draft?: boolean;
};

export class GitHubReleasesProvider implements IGitHubReleasesProvider {
  constructor(
    private readonly token: string,
    private readonly repo: string,
    private readonly logger?: ILogger
  ) {}

  async listReleases(input: ListGitHubReleasesInput = {}): Promise<GitHubRelease[]> {
    return logOperation(
      this.logger,
      'GitHub releases query',
      { repo: this.repo },
      async () => {
        if (!this.token) {
          throw createAdminError(
            503,
            'configuration_error',
            'Missing required environment variable: GITHUB_RELEASES_TOKEN'
          );
        }

        if (!this.repo || !REPO_PATTERN.test(this.repo)) {
          throw createAdminError(
            503,
            'configuration_error',
            'Missing or invalid environment variable: GITHUB_RELEASES_REPO'
          );
        }

        const releases: GitHubRelease[] = [];
        let page = 1;

        while (true) {
          const items = await this.getReleasesPage(page);
          let reachedKnown = false;
          for (const item of items) {
            const mapped = toRelease(item);
            if (!mapped) continue;
            if (input.publishedAfter && mapped.publishedAt <= input.publishedAfter) {
              reachedKnown = true;
              break;
            }
            releases.push(mapped);
          }

          if (reachedKnown || items.length < RELEASES_PAGE_SIZE) break;
          page += 1;
        }

        return releases;
      },
      result => ({ recordCount: result.length })
    );
  }

  private async getReleasesPage(page: number): Promise<GitHubReleaseResponse[]> {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${this.repo}/releases?per_page=${RELEASES_PAGE_SIZE}&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'User-Agent': 'arg.software',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );
    const payload = (await response.json().catch(() => [])) as
      | GitHubReleaseResponse[]
      | { message?: string };

    if (!response.ok || !Array.isArray(payload)) {
      throw createAdminError(
        502,
        'github_request_failed',
        'Unable to fetch releases from GitHub'
      );
    }

    return payload;
  }
}

function publicReleaseBody(body: string | null | undefined): string {
  return String(body || '')
    .split('\n')
    .filter(line => !/full changelog/i.test(line))
    .filter(line => !/github\.com\/ARG-Software\/arg-architect/i.test(line))
    .join('\n')
    .trim();
}

function toRelease(item: GitHubReleaseResponse): GitHubRelease | null {
  if (item.draft) return null;

  const tagName = String(item.tag_name || '').trim();
  const publishedAt = item.published_at || '';
  const htmlUrl = String(item.html_url || '').trim();
  if (!item.id || !tagName || !publishedAt || !htmlUrl) return null;

  return {
    githubId: String(item.id),
    tagName,
    name: String(item.name || '').trim() || tagName,
    body: publicReleaseBody(item.body),
    htmlUrl,
    publishedAt,
  };
}
