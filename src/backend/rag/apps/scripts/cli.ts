import { sleep } from '../../application/shared/time.js';
import type { IngestSourceUseCase } from '../../application/usecases/ingestion/ingestsource.usecase.js';
import type { IIngestionRunOptions, IIngestSourceResult } from '../../application/ingestion/iingestion.types.js';
import type { IRagSource } from '../../domain/sources/ragsource.types.js';

export function isDryRun(): boolean {
  return (
    process.argv.includes('--dry-run') ||
    process.argv.includes('--dryRun') ||
    process.env.npm_config_dry_run === 'true'
  );
}

export function getIngestionRunOptions(): IIngestionRunOptions {
  const selection = {
    all: hasFlag('--all') || process.env.npm_config_all === 'true',
    force:
      hasFlag('--force') ||
      hasFlag('--refresh') ||
      process.env.npm_config_force === 'true' ||
      process.env.npm_config_refresh === 'true',
    fallbackOnly: hasFlag('--fallback-only') || process.env.npm_config_fallback_only === 'true',
    sourceKeys: getOptionValues('--source'),
    filePaths: getOptionValues('--file'),
    urls: getOptionValues('--url'),
  };

  for (const value of getPositionalArgs()) {
    addInferredPositionalValue(selection, value);
  }

  return selection;
}

export function hasSourceFilters(selection: IIngestionRunOptions): boolean {
  return (
    selection.all ||
    selection.sourceKeys.length > 0 ||
    selection.filePaths.length > 0 ||
    selection.urls.length > 0
  );
}

export function printSelectionUsage(scriptName: string): void {
  console.error(
    `Usage: npm run ${scriptName} -- --all|--source <sourceKey>|--file <filePath>|--url <url> [--dry-run] [--refresh] [--fallback-only]`
  );
}

export async function runIngestionBatch<T>({
  items,
  loadSource,
  describeItem,
  ingestSourceUseCase,
  selection,
  dryRun,
}: {
  items: T[];
  loadSource: (item: T) => IRagSource | Promise<IRagSource>;
  describeItem: (item: T) => string;
  ingestSourceUseCase: IngestSourceUseCase;
  selection: IIngestionRunOptions;
  dryRun: boolean;
}): Promise<{ results: IIngestSourceResult[]; failureCount: number }> {
  const requestDelayMs = getEmbeddingRequestDelayMs();
  const results: IIngestSourceResult[] = [];
  let failureCount = 0;

  for (const item of items) {
    try {
      const source = await loadSource(item);
      const result = await ingestSourceUseCase.execute({
        source,
        dryRun,
        force: selection.force,
        fallbackOnly: selection.fallbackOnly,
      });
      results.push(result);
      printIngestResult(result, dryRun);
    } catch (error) {
      failureCount += 1;
      console.error(`failed ${describeItem(item)}: ${getErrorMessage(error)}`);
    }

    if (!dryRun && requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
  }

  return { results, failureCount };
}

export function printIngestionSummary({
  title,
  loadedLabel,
  loadedCount,
  results,
  failureCount,
  dryRun,
}: {
  title: string;
  loadedLabel: string;
  loadedCount: number;
  results: IIngestSourceResult[];
  failureCount: number;
  dryRun: boolean;
}): void {
  const ingested = results.filter(result => !result.skipped);
  const skipped = results.filter(result => result.skipped);
  const unchanged = skipped.filter(result => result.reason === 'unchanged_content');
  const chunkCount = ingested.reduce((total, result) => total + result.chunkCount, 0);

  console.log(`\n${title}`);
  console.log(`${loadedLabel}: ${loadedCount}`);
  console.log(`sources ${dryRun ? 'ready' : 'ingested'}: ${ingested.length}`);
  console.log(`sources skipped: ${skipped.length}`);
  console.log(`sources unchanged: ${unchanged.length}`);
  console.log(`chunks ${dryRun ? 'planned' : 'ingested'}: ${chunkCount}`);
  console.log(`failures: ${failureCount}`);
}

export function printIngestResult(result: IIngestSourceResult, dryRun: boolean): void {
  const status = result.skipped ? `skipped:${result.reason}` : dryRun ? 'ready' : 'ingested';
  console.log(`${status} ${result.sourceType}/${result.sourceKey} (${result.chunkCount} chunks)`);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getEmbeddingRequestDelayMs(): number {
  const value = Number(process.env.EMBEDDING_REQUEST_DELAY_MS ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getOptionValues(option: string): string[] {
  const values: string[] = [];
  const envName = `npm_config_${option.slice(2).replace(/-/g, '_')}`;
  const envValue = process.env[envName];

  if (envValue && envValue !== 'true') {
    values.push(envValue);
  }

  if (envValue === 'true') {
    const [positionalValue] = getPositionalArgs();
    if (positionalValue) {
      values.push(positionalValue);
    }
  }

  process.argv.forEach((arg, index) => {
    if (arg === option && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  });

  return values.map(value => value.trim()).filter(Boolean);
}

function getPositionalArgs(): string[] {
  const optionsWithValues = new Set(['--source', '--file', '--url']);

  return process.argv.slice(2).filter((arg, index, args) => {
    if (arg.startsWith('--')) {
      return false;
    }

    return !optionsWithValues.has(args[index - 1] ?? '');
  });
}

function addInferredPositionalValue(selection: IIngestionRunOptions, value: string): void {
  if (selection.sourceKeys.includes(value) || selection.filePaths.includes(value) || selection.urls.includes(value)) {
    return;
  }

  if (isHttpUrl(value)) {
    selection.urls.push(value);
    return;
  }

  if (value.includes('/') || value.includes('\\') || value.includes('.')) {
    selection.filePaths.push(value);
    return;
  }

  selection.sourceKeys.push(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
