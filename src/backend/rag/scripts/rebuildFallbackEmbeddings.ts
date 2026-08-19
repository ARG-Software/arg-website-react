import { loadLocalEnv } from '../config/env.js';
import { createGasparDependencies } from '../apps/di/createGasparDependencies.js';
import { rebuildFallbackEmbeddings } from '../application/maintenance/rebuildFallbackEmbeddings.js';

loadLocalEnv();

const dependencies = createGasparDependencies();
const result = await rebuildFallbackEmbeddings(
  dependencies.createMaintenanceDependencies(),
  {
    onCleared(chunkCount) {
      console.log(`Clearing fallback embeddings for ${chunkCount} chunks.`);
    },
    onProgress({ rebuiltCount, chunkCount }) {
      console.log(`Rebuilt ${rebuiltCount}/${chunkCount} fallback embeddings.`);
    },
  }
);

if (result.chunkCount === 0) {
  console.log('No RAG chunks found. Nothing to rebuild.');
  process.exit(0);
}

console.log(`Rebuilt all ${result.rebuiltCount} fallback embeddings from stored chunk content.`);
