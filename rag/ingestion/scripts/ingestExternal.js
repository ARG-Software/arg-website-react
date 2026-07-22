import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createSupabaseServiceClient } from '../../clients/supabaseClient.js';
import { loadLocalEnv } from '../../config/loadLocalEnv.js';
import { ingestSource } from '../ingestSource.js';
import { loadExternalHtmlSource } from '../sources/html.js';
import { isDryRun } from './cli.js';

loadLocalEnv();

const dryRun = isDryRun();
const allowlist = await loadAllowlist();

if (allowlist.length === 0) {
  console.log('External ingestion allowlist is empty. Nothing to ingest.');
  process.exit(0);
}

const supabase = dryRun ? null : createSupabaseServiceClient();
const results = [];
const failures = [];

for (const item of allowlist) {
  try {
    const source = await loadExternalHtmlSource(item);
    const result = await ingestSource({ supabase, source, dryRun });
    results.push(result);
    printResult(result);
  } catch (error) {
    failures.push({ item, error });
    console.error(`failed ${item.url}: ${error.message}`);
  }
}

const ingested = results.filter(result => !result.skipped);
const skipped = results.filter(result => result.skipped);
const chunkCount = ingested.reduce((total, result) => total + result.chunkCount, 0);

console.log('\nExternal ingestion summary');
console.log(`urls loaded: ${allowlist.length}`);
console.log(`sources ${dryRun ? 'ready' : 'ingested'}: ${ingested.length}`);
console.log(`sources skipped: ${skipped.length}`);
console.log(`chunks ${dryRun ? 'planned' : 'ingested'}: ${chunkCount}`);
console.log(`failures: ${failures.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}

async function loadAllowlist() {
  const filePath = path.join(process.cwd(), 'rag/config/external-sources.json');
  const sources = JSON.parse(await readFile(filePath, 'utf8'));

  if (!Array.isArray(sources)) {
    throw new Error('rag/config/external-sources.json must contain an array');
  }

  return sources.map(validateAllowlistItem);
}

function validateAllowlistItem(item) {
  if (!item || typeof item !== 'object') {
    throw new Error('External source entries must be objects');
  }

  if (!item.url) {
    throw new Error('External source entries require a url');
  }

  const url = new URL(item.url);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`External source URL must be HTTP(S): ${item.url}`);
  }

  return {
    url: url.toString(),
    title: item.title,
    trusted: item.trusted ?? true,
  };
}

function printResult(result) {
  const status = result.skipped ? `skipped:${result.reason}` : dryRun ? 'ready' : 'ingested';
  console.log(`${status} ${result.sourceType}/${result.sourceKey} (${result.chunkCount} chunks)`);
}
