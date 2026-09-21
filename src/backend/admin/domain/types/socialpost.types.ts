export type SocialPost = {
  id?: string;
  bufferPostId: string;
  text: string;
  coverImageUrl: string | null;
  externalUrl: string | null;
  publishedAt: string;
};

export type SocialPostListItem = {
  id: string;
  excerpt: string;
  coverImageUrl: string | null;
  externalUrl: string | null;
  publishedAt: string;
};
