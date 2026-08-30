export abstract class SupabaseRepositoryBase {
  protected getPageRange(page = 1, pageSize = 10): { from: number; to: number } {
    const from = (page - 1) * pageSize;

    return { from, to: from + pageSize - 1 };
  }
}
