export interface IOpenGraphImageProvider {
  fetchCoverFromText(text: string): Promise<string | null>;
}
