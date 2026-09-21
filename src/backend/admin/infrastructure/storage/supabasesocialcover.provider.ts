import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

import type { ISocialCoverProvider } from '../../application/ports/isocialcover.provider.js';
import type { ILogger } from '../../../shared/logger/ilogger.js';
import { logOperation } from '../../../shared/logger/logoperation.js';

const BUCKET = 'social-covers';
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class SupabaseSocialCoverProvider implements ISocialCoverProvider {
  constructor(
    private readonly client: SupabaseClient,
    private readonly logger?: ILogger
  ) {}

  async store(bufferPostId: string, sourceUrl: string): Promise<string | null> {
    return logOperation(
      this.logger,
      'Supabase social cover upload',
      { bucket: BUCKET, bufferPostId },
      async () => {
        const image = await downloadImage(sourceUrl);
        if (!image) return null;

        const webp = await compressCover(image);
        if (!webp) return null;

        const path = coverFileName(bufferPostId);
        const { error } = await this.client.storage.from(BUCKET).upload(path, webp, {
          contentType: 'image/webp',
          upsert: true,
        });
        if (error) return null;

        return this.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl || null;
      }
    );
  }

  async removeMissing(keepBufferPostIds: string[]): Promise<void> {
    if (!keepBufferPostIds.length) return;

    await logOperation(
      this.logger,
      'Supabase social cover prune',
      { bucket: BUCKET, recordCount: keepBufferPostIds.length },
      async () => {
        const { data, error } = await this.client.storage.from(BUCKET).list('', { limit: 1000 });
        if (error || !data?.length) return;

        const keep = new Set(keepBufferPostIds.map(coverFileName));
        const extra = data.map(file => file.name).filter(name => name && !keep.has(name));
        if (!extra.length) return;

        await this.client.storage.from(BUCKET).remove(extra);
      }
    );
  }
}

async function downloadImage(sourceUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': BROWSER_UA,
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const contentType = String(response.headers.get('content-type') || '');
    if (contentType && !contentType.startsWith('image/')) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return null;

    return bytes;
  } catch {
    return null;
  }
}

async function compressCover(image: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(image)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    return null;
  }
}

function coverFileName(bufferPostId: string): string {
  const safe = String(bufferPostId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 180);

  return `${safe || 'cover'}.webp`;
}
