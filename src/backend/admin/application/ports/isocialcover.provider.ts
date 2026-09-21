export interface ISocialCoverProvider {
  store(bufferPostId: string, sourceUrl: string): Promise<string | null>;
  removeMissing(keepBufferPostIds: string[]): Promise<void>;
}
