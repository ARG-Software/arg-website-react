import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { loadLocalEnv } from '../config/loadLocalEnv.js';
import type { IngestSourceResult } from '../types/ingestion.js';
import type { RagSource } from '../types/source.js';
import { ingestSource } from '../ingestion/ingestPipeline.js';
import { loadLocalSources } from '../ingestion/sources/local.js';
import { getIngestionRunOptions, hasSourceFilters, isDryRun, printSelectionUsage } from './cli.js';

loadLocalEnv();

const dryRun = isDryRun();
const selection = getIngestionRunOptions();
const requestDelayMs = getEmbeddingRequestDelayMs();

if (!hasSourceFilters(selection)) {
  printSelectionUsage('rag:ingest:local');
  process.exit(1);
}

const supabase = createSupabaseServiceClient();
const sources = await loadLocalSources(process.cwd(), selection);
const results: IngestSourceResult[] = [];
const failures: Array<{ source: RagSource; error: unknown }> = [];

if (sources.length === 0) {
  console.log('No local sources matched the selected filters. Nothing to ingest.');
  process.exit(0);
}

for (const source of sources) {
  try {
    const result = await ingestSource({
      supabase,
      source,
      dryRun,
      force: selection.force,
      fallbackOnly: selection.fallbackOnly,
    });
    results.push(result);
    printResult(result);
  } catch (error) {
    failures.push({ source, error });
    console.error(`failed ${source.sourceType}/${source.sourceKey}: ${getErrorMessage(error)}`);
  }

  if (!dryRun && requestDelayMs > 0) {
    await sleep(requestDelayMs);
  }
}

const ingested = results.filter(result => !result.skipped);
const skipped = results.filter(result => result.skipped);
const unchanged = skipped.filter(result => result.reason === 'unchanged_content');
const chunkCount = ingested.reduce((total, result) => total + result.chunkCount, 0);

console.log('\nLocal ingestion summary');
console.log(`sources loaded: ${sources.length}`);
console.log(`sources ${dryRun ? 'ready' : 'ingested'}: ${ingested.length}`);
console.log(`sources skipped: ${skipped.length}`);
console.log(`sources unchanged: ${unchanged.length}`);
console.log(`chunks ${dryRun ? 'planned' : 'ingested'}: ${chunkCount}`);
console.log(`failures: ${failures.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}

function printResult(result: IngestSourceResult): void {
  const status = result.skipped ? `skipped:${result.reason}` : dryRun ? 'ready' : 'ingested';
  console.log(`${status} ${result.sourceType}/${result.sourceKey} (${result.chunkCount} chunks)`);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getEmbeddingRequestDelayMs(): number {
  const value = Number(process.env.GEMINI_EMBEDDING_REQUEST_DELAY_MS ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
