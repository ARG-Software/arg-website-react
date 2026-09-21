export type SocialPost = {
  id?: string;
  bufferPostId: string;
  text: string;
  coverImageUrl: string | null;
  externalUrl: string | null;
  publishedAt: string;
  likeCount: number;
};

export type SocialPostListItem = {
  id: string;
  excerpt: string;
  text: string;
  coverImageUrl: string | null;
  externalUrl: string | null;
  publishedAt: string;
  likeCount: number;
};
