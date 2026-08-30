import { loadLocalEnv } from './loadlocalenv.js';
import { createRagContainer } from '../di/createrag.container.js';
import { loadFirstPartySources } from '../../infrastructure/ingestion/loaders/loadfirstpartysources.js';
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
  printSelectionUsage('rag:ingest:local');
  process.exit(1);
}

const container = createRagContainer();
const sources = await loadFirstPartySources(process.cwd(), selection);

if (sources.length === 0) {
  console.log('No first-party sources matched the selected filters. Nothing to ingest.');
  process.exit(0);
}

const { results, failureCount } = await runIngestionBatch({
  items: sources,
  loadSource: source => source,
  describeItem: source => `${source.sourceType}/${source.sourceKey}`,
  ingestSourceUseCase: container.ingestion.ingestSourceUseCase,
  selection,
  dryRun,
});

printIngestionSummary({
  title: 'First-party ingestion summary',
  loadedLabel: 'sources loaded',
  loadedCount: sources.length,
  results,
  failureCount,
  dryRun,
});

if (failureCount > 0) {
  process.exitCode = 1;
}
