# Gaspar assistant (RAG backend)

Read before editing `src/backend/rag/` or the assistant widget. Moved from AGENTS.md.

## RAG Assistant Backend (Gaspar)
- `src/backend/rag/` follows domain → application → infrastructure → apps. Domain and application never import infrastructure. `apps/di/createrag.container.ts` is the composition root; `apps/di/rag.container.ts` is its lazy singleton wrapper for API handlers.
- `application/usecases/` holds executable use cases grouped by entrypoint surface (`assistant/`, `ingestion/`, `maintenance/`). Feature logic lives in feature slices: `retrieval/`, `retrievalplanning/`, `answering/`, `assistantcopy/`, `llm/`, `ingestion/`, `config/`, `shared/`.
- `IngestSourceUseCase` lives in `application/usecases/ingestion/ingestsource.usecase.ts`. Keep ingestion helpers such as chunking, redaction, source factories, and shared ingestion run types under `application/ingestion/`.
- `application/retrieval/` layout: `retrievalstrategy.ts` (strategy contract), `routedcontextretriever.ts` (chain runner), `createroutedcontextretriever.ts` (single source of truth for the ordered strategy chain — used by both the container and test fakes), `embeddingresolver.ts` (`SemanticEmbeddingResolver` primary/fallback embedding resolution + `ISemanticSearchInput`), `semanticsearch.ts` (two-threshold context search), `contextsmapper.ts` (record-to-context mappers), and `strategies/` with one retrieval strategy per file.
- Repository ports are split by direction: `IRagSourceReadRepository`/`IRagSourceWriteRepository` and `IRagChunkReadRepository`/`IRagChunkWriteRepository`. `IRagReadRepositories` bundles the read ports for retrieval. Supabase adapters implement both sides and the container passes the same instance to read and write slots.
- Ports hold contracts plus symbols shared across the boundary: `providererrors.ts` defines `EmbeddingQuotaExceededError`, which infrastructure throws and application catches. Pure vocabulary types such as `EmbeddingIndex` belong in domain (`domain/sources/ragsource.types.ts`), not ports.
- Infrastructure owns mechanisms (filesystem, network, format libraries, config files), not only port implementations. Add a port only when a second implementation or a test fake needs it.
- `infrastructure/ingestion/loaders/` is split per source family: `loadfirstpartysources.ts` (entry with manifest dispatch and selection filtering), `loadjsonmanifestsources.ts`, `loadprojectsources.ts`, `loadpartnersources.ts`, `loadteamprofilesources.ts`, `loadblogsources.ts`, `loadpatternsources.ts`, `loadlocaldocumentsources.ts`, `loadtrustedexternalsources.ts`, plus `loaderfiles.ts` for shared file/path/selection mechanics. Family loaders must not import back from the entry file.
- Source manifests live at the `infrastructure/ingestion/` root: `sourcemanifest.config.ts`, `sourcemanifest.types.ts`, and `sitedata.types.ts` (shapes of the site data files on disk).
- CLI entry points live in `src/backend/rag/apps/scripts/` because they are executable app entrypoints. Ingest scripts (`ingestlocal.ts`, `ingestexternal.ts`) share batch mechanics from `apps/scripts/cli.ts`.

## Assistant Rate Limits and Logging
- Assistant rate-limit notices are display-only assistant bubbles with `source: 'rate_limit_notice'` and must be excluded from AI conversation context.
- The assistant widget should show natural first-person cooldown or handoff copy from `src/frontend/data/assistant.json` rather than raw API error text.
- Conversation logging should keep periodic saves, visibility/pagehide saves, and avoid idle flushes while an assistant response is still loading.
- Discord webhook notifications for assistant conversations should be sent only when the conversation is first created, not on every upsert/save.
