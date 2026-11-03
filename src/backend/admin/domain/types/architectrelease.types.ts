export type ArchitectRelease = {
  id?: string;
  githubId: string;
  tagName: string;
  name: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
};

export type ArchitectReleaseListItem = {
  id: string;
  githubId: string;
  tagName: string;
  name: string;
  excerpt: string;
  body: string;
  htmlUrl: string;
  publishedAt: string;
};
