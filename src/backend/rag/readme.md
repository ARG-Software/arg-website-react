# RAG Administration

Gaspar reads sources from Supabase, not directly from the website files.

After importing Medium posts, run:

```bash
npm run sync:blog
```

This credential-requiring admin workflow imports Medium posts and indexes all first-party RAG sources. It is not a public Netlify endpoint.

After manually adding or editing a Markdown post under `src/frontend/blog/`, run:

```bash
npm run rag:ingest:local -- --all
```

Use `npm run rag:ingest:local -- --all --fallback-only` to backfill fallback vectors without invoking the primary embedding provider. Once primary quota is available, use `npm run rag:ingest:local -- --all --refresh` to restore primary vectors for fallback-only chunks.
