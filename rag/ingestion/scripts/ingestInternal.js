import { createSupabaseServiceClient } from '../../clients/supabaseClient.js';
import { loadLocalEnv } from '../../config/loadLocalEnv.js';
import { ingestSource } from '../ingestSource.js';
import { loadInternalSources } from '../sources/internal.js';
import { isDryRun } from './cli.js';

loadLocalEnv();

const dryRun = isDryRun();
const supabase = dryRun ? null : createSupabaseServiceClient();
const sources = await loadInternalSources();
const results = [];
const failures = [];

for (const source of sources) {
  try {
    const result = await ingestSource({ supabase, source, dryRun });
    results.push(result);
    printResult(result);
  } catch (error) {
    failures.push({ source, error });
    console.error(`failed ${source.sourceType}/${source.sourceKey}: ${error.message}`);
  }
}

const ingested = results.filter(result => !result.skipped);
const skipped = results.filter(result => result.skipped);
const chunkCount = ingested.reduce((total, result) => total + result.chunkCount, 0);

console.log('\nInternal ingestion summary');
console.log(`sources loaded: ${sources.length}`);
console.log(`sources ${dryRun ? 'ready' : 'ingested'}: ${ingested.length}`);
console.log(`sources skipped: ${skipped.length}`);
console.log(`chunks ${dryRun ? 'planned' : 'ingested'}: ${chunkCount}`);
console.log(`failures: ${failures.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}

function printResult(result) {
  const status = result.skipped ? `skipped:${result.reason}` : dryRun ? 'ready' : 'ingested';
  console.log(`${status} ${result.sourceType}/${result.sourceKey} (${result.chunkCount} chunks)`);
}
