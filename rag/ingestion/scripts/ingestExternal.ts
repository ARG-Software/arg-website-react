import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createSupabaseServiceClient } from '../../clients/supabaseClient.js';
import { loadLocalEnv } from '../../config/loadLocalEnv.js';
import type { IngestSourceResult } from '../../types/ingestion.js';
import { ingestSource } from '../ingestSource.js';
import { loadExternalHtmlSource, type ExternalHtmlSourceInput } from '../sources/html.js';
import { getIngestionSelection, hasSelection, isDryRun, printSelectionUsage } from './cli.js';

loadLocalEnv();

const dryRun = isDryRun();
const selection = getIngestionSelection();

if (!hasSelection(selection)) {
  printSelectionUsage('rag:ingest:external');
  process.exit(1);
}

const allowlist = filterAllowlist(await loadAllowlist(), selection);

if (allowlist.length === 0) {
  console.log('External ingestion allowlist is empty. Nothing to ingest.');
  process.exit(0);
}

const supabase = createSupabaseServiceClient();
const results: IngestSourceResult[] = [];
const failures: Array<{ item: ExternalHtmlSourceInput; error: unknown }> = [];

for (const item of allowlist) {
  try {
    const source = await loadExternalHtmlSource(item);
    const result = await ingestSource({ supabase, source, dryRun, force: selection.force });
    results.push(result);
    printResult(result);
  } catch (error) {
    failures.push({ item, error });
    console.error(`failed ${item.url}: ${getErrorMessage(error)}`);
  }
}

const ingested = results.filter(result => !result.skipped);
const skipped = results.filter(result => result.skipped);
const unchanged = skipped.filter(result => result.reason === 'unchanged_content');
const chunkCount = ingested.reduce((total, result) => total + result.chunkCount, 0);

console.log('\nExternal ingestion summary');
console.log(`urls loaded: ${allowlist.length}`);
console.log(`sources ${dryRun ? 'ready' : 'ingested'}: ${ingested.length}`);
console.log(`sources skipped: ${skipped.length}`);
console.log(`sources unchanged: ${unchanged.length}`);
console.log(`chunks ${dryRun ? 'planned' : 'ingested'}: ${chunkCount}`);
console.log(`failures: ${failures.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}

async function loadAllowlist(): Promise<ExternalHtmlSourceInput[]> {
  const filePath = path.join(process.cwd(), 'rag/config/external-sources.json');
  const sources = JSON.parse(await readFile(filePath, 'utf8'));

  if (!Array.isArray(sources)) {
    throw new Error('rag/config/external-sources.json must contain an array');
  }

  return sources.map(validateAllowlistItem);
}

function validateAllowlistItem(item: unknown): ExternalHtmlSourceInput {
  if (!item || typeof item !== 'object') {
    throw new Error('External source entries must be objects');
  }

  if (!('url' in item) || !item.url) {
    throw new Error('External source entries require a url');
  }

  const rawUrl = String(item.url);
  const url = new URL(rawUrl);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`External source URL must be HTTP(S): ${rawUrl}`);
  }

  return {
    url: url.toString(),
    title: 'title' in item && typeof item.title === 'string' ? item.title : undefined,
    trusted: 'trusted' in item && typeof item.trusted === 'boolean' ? item.trusted : true,
  };
}

function filterAllowlist(
  allowlist: ExternalHtmlSourceInput[],
  selected: ReturnType<typeof getIngestionSelection>
): ExternalHtmlSourceInput[] {
  if (selected.all) {
    return allowlist;
  }

  return allowlist.filter(item => {
    const normalizedUrl = new URL(item.url).toString();
    return (
      selected.urls.some(url => new URL(url).toString() === normalizedUrl) ||
      selected.sourceKeys.includes(item.url) ||
      (item.title ? selected.sourceKeys.includes(item.title) : false)
    );
  });
}

function printResult(result: IngestSourceResult): void {
  const status = result.skipped ? `skipped:${result.reason}` : dryRun ? 'ready' : 'ingested';
  console.log(`${status} ${result.sourceType}/${result.sourceKey} (${result.chunkCount} chunks)`);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
