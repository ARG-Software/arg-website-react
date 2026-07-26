export function isDryRun(): boolean {
  return (
    process.argv.includes('--dry-run') ||
    process.argv.includes('--dryRun') ||
    process.env.npm_config_dry_run === 'true'
  );
}

import type { IngestionRunOptions } from '../types/ingestion.js';

export function getIngestionRunOptions(): IngestionRunOptions {
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

export function hasSourceFilters(selection: IngestionRunOptions): boolean {
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

function addInferredPositionalValue(selection: IngestionRunOptions, value: string): void {
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
