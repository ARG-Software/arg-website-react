import { loadLocalEnv } from './loadlocalenv.js';
import { createRagContainer } from '../di/createrag.container.js';
import {
  loadTrustedExternalSource,
  loadTrustedExternalSourceEntries,
} from '../../infrastructure/ingestion/loaders/loadtrustedexternalsources.js';
import {
  getIngestionRunOptions,
  hasSourceFilters,
  isDryRun,
  printIngestionSummary,
  printSelectionUsage,
  runIngestionBatch,
} from './cli.js';

loadLocalEnv();

const dryRun = isDryRun();
const selection = getIngestionRunOptions();

if (!hasSourceFilters(selection)) {
  printSelectionUsage('rag:ingest:external');
  process.exit(1);
}

const container = createRagContainer();
const allowlist = await loadTrustedExternalSourceEntries(selection);

if (allowlist.length === 0) {
  console.log('Trusted external ingestion allowlist is empty. Nothing to ingest.');
  process.exit(0);
}

const { results, failureCount } = await runIngestionBatch({
  items: allowlist,
  loadSource: item => loadTrustedExternalSource(item),
  describeItem: item => item.url,
  ingestSourceUseCase: container.ingestion.ingestSourceUseCase,
  selection,
  dryRun,
});

printIngestionSummary({
  title: 'Trusted external ingestion summary',
  loadedLabel: 'urls loaded',
  loadedCount: allowlist.length,
  results,
  failureCount,
  dryRun,
});

if (failureCount > 0) {
  process.exitCode = 1;
}
