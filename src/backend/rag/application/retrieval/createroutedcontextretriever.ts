import type { IRagConfig } from '../config/irag.configuration.js';
import type { IRagChunkReadRepository } from '../ports/iragchunk.repository.js';
import type { IRagChunkSearchRepository } from '../ports/iragchunksearch.repository.js';
import type { IRagSourceReadRepository } from '../ports/iragsource.repository.js';
import type { SemanticEmbeddingResolver } from './embeddingresolver.js';
import { RoutedContextRetriever } from './routedcontextretriever.js';
import { CommercialDeliveryRetrievalStrategy } from './strategies/commercialdelivery.js';
import { EditorialRetrievalStrategy } from './strategies/editorial.js';
import { ForcedFirstChunksRetrievalStrategy } from './strategies/forcedfirstchunks.js';
import { ExactTechnologyEvidenceRetriever } from './strategies/exacttechnology.js';
import { LatestBlogRetrievalStrategy } from './strategies/latestblog.js';
import { LinkActionRetrievalStrategy } from './strategies/linkaction.js';
import { OpenSourceRetrievalStrategy } from './strategies/opensource.js';
import { PersonProfileRetriever } from './strategies/personprofile.js';
import { ProjectReferenceRetriever } from './strategies/projectreferences.js';
import { DirectEvidenceRetrievalStrategy } from './strategies/semanticdirectevidence.js';

export function createRoutedContextRetriever({
  sourceRepository,
  chunkRepository,
  chunkSearchRepository,
  config,
  embeddingResolver,
}: {
  sourceRepository: IRagSourceReadRepository;
  chunkRepository: IRagChunkReadRepository;
  chunkSearchRepository: IRagChunkSearchRepository;
  config: IRagConfig;
  embeddingResolver: SemanticEmbeddingResolver;
}): RoutedContextRetriever {
  const exactTechnologyRetriever = new ExactTechnologyEvidenceRetriever(chunkSearchRepository, config);
  const personProfileRetriever = new PersonProfileRetriever(
    sourceRepository,
    chunkRepository,
    chunkSearchRepository,
    config,
    embeddingResolver
  );
  const projectReferenceRetriever = new ProjectReferenceRetriever(
    sourceRepository,
    chunkRepository,
    config
  );

  return new RoutedContextRetriever([
    new ForcedFirstChunksRetrievalStrategy(sourceRepository, chunkRepository, config),
    new LatestBlogRetrievalStrategy(sourceRepository, chunkRepository, config),
    new LinkActionRetrievalStrategy(sourceRepository, chunkRepository, config),
    new CommercialDeliveryRetrievalStrategy(sourceRepository, chunkRepository, chunkSearchRepository, config),
    new OpenSourceRetrievalStrategy(chunkSearchRepository, config, embeddingResolver),
    new DirectEvidenceRetrievalStrategy(
      sourceRepository,
      chunkRepository,
      chunkSearchRepository,
      config,
      embeddingResolver,
      exactTechnologyRetriever,
      personProfileRetriever,
      projectReferenceRetriever
    ),
    new EditorialRetrievalStrategy(chunkSearchRepository, config, embeddingResolver),
  ]);
}
