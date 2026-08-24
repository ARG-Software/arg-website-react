import { loadLocalEnv } from '../config/env.js';
import { createGasparDependencies } from '../apps/di/createGasparDependencies.js';
import { ingestSource } from '../application/ingestion/ingestPipeline.js';
import {
  loadTrustedExternalSource,
  loadTrustedExternalSourceEntries,
} from '../infrastructure/ingestion/loaders/loadTrustedExternalSources.js';
import type { IIngestSourceResult } from '../application/ingestion/IIngestionTypes.js';
import { sleep } from '../application/common/time.js';
import { getIngestionRunOptions, hasSourceFilters, isDryRun, printSelectionUsage } from './cli.js';

loadLocalEnv();

const dryRun = isDryRun();
const selection = getIngestionRunOptions();
const requestDelayMs = getEmbeddingRequestDelayMs();

if (!hasSourceFilters(selection)) {
  printSelectionUsage('rag:ingest:external');
  process.exit(1);
}

const dependencies = createGasparDependencies();
const allowlist = await loadTrustedExternalSourceEntries(process.cwd(), selection);

if (allowlist.length === 0) {
  console.log('Trusted external ingestion allowlist is empty. Nothing to ingest.');
  process.exit(0);
}

const results: IIngestSourceResult[] = [];
const failures: Array<{ item: { url: string }; error: unknown }> = [];

for (const item of allowlist) {
  try {
    const source = await loadTrustedExternalSource(item);
    const result = await ingestSource({
      ...dependencies.createIngestSourceDependencies(),
      source,
      dryRun,
      force: selection.force,
      fallbackOnly: selection.fallbackOnly,
    });
    results.push(result);
    printResult(result);
  } catch (error) {
    failures.push({ item, error });
    console.error(`failed ${item.url}: ${getErrorMessage(error)}`);
  }

  if (!dryRun && requestDelayMs > 0) {
    await sleep(requestDelayMs);
  }
}

const ingested = results.filter(result => !result.skipped);
const skipped = results.filter(result => result.skipped);
const unchanged = skipped.filter(result => result.reason === 'unchanged_content');
const chunkCount = ingested.reduce((total, result) => total + result.chunkCount, 0);

console.log('\nTrusted external ingestion summary');
console.log(`urls loaded: ${allowlist.length}`);
console.log(`sources ${dryRun ? 'ready' : 'ingested'}: ${ingested.length}`);
console.log(`sources skipped: ${skipped.length}`);
console.log(`sources unchanged: ${unchanged.length}`);
console.log(`chunks ${dryRun ? 'planned' : 'ingested'}: ${chunkCount}`);
console.log(`failures: ${failures.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}

function printResult(result: IIngestSourceResult): void {
  const status = result.skipped ? `skipped:${result.reason}` : dryRun ? 'ready' : 'ingested';
  console.log(`${status} ${result.sourceType}/${result.sourceKey} (${result.chunkCount} chunks)`);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getEmbeddingRequestDelayMs(): number {
  const value = Number(process.env.EMBEDDING_REQUEST_DELAY_MS ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
