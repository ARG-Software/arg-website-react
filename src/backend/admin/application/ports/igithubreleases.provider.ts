import type { ArchitectRelease } from '../../domain/types/architectrelease.types.js';

export type GitHubRelease = Omit<ArchitectRelease, 'id'>;

export type ListGitHubReleasesInput = {
  publishedAfter?: string;
};

export interface IGitHubReleasesProvider {
  listReleases(input?: ListGitHubReleasesInput): Promise<GitHubRelease[]>;
}
