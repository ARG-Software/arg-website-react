---
seoTitle: Adding Vector Search to TypeScript Clean Architecture with a TurboVec Sidecar
slug: adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis
author: José Antunes
authorUrl: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
authorType: Person
authorSameAs: https://www.linkedin.com/in/jos%C3%A9-francisco-antunes-b8068bb5/
tag: AI
tags: AI, Architecture, Backend
title: Adding Vector Search to TypeScript Clean Architecture with a TurboVec Sidecar
subtitle: Use a Python sidecar and an application port to test TurboVec from a TypeScript backend without coupling business logic to vector-search infrastructure.
intro: Use a Python sidecar and an application port to test TurboVec from a TypeScript backend without coupling business logic to vector-search infrastructure.
date: June 23, 2026
dateModified: September 19, 2026
reviewedOn: September 19, 2026
readTime: 13 min read
mediumUrl: https://ai.plainenglish.io/adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis-1e9104ab278b
---
![Adding vector search to TypeScript Clean Architecture with a TurboVec sidecar](/images/blog/adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis/adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis-header.webp)

At some point, a product team asks for the deceptively simple feature:

> "Can our app answer questions from our own documents?"

That usually means retrieval-augmented generation. Before the model answers, your system searches internal content, retrieves relevant chunks, and sends those chunks as context. The retrieval step is where vector search enters the architecture.

The previous article, [TurboQuant, TurboVec, and the Real RAM Math for Local Vector Search](/blog/the-ai-big-lie-you-dont-need-32-gb-of-ram-for-vector-search-anymore/), covered the important correction: TurboVec can reduce raw vector payloads dramatically, but the result depends on dimensions, bit width, metadata, and benchmarked recall. It is not a blanket guarantee that every production RAG system suddenly fits on a laptop.

This article shows a pragmatic TypeScript architecture for testing it anyway.

## Why a Sidecar Is the Honest Boundary

[TurboVec](https://github.com/RyanCodrai/turbovec) ships Rust and Python APIs. It does not ship a Node.js package today. That does not make it unusable from a TypeScript backend. It means the clean boundary is a small internal service:

```text
TypeScript API
  Controller -> Use case -> Vector search port
                         |
                         | HTTP on the private network
                         v
Python sidecar
  FastAPI -> TurboVec IdMapIndex
```

The sidecar should not leak into business logic. Your application code should depend on a port that says "search indexed knowledge," not on Python, Rust, bit packing, or TurboQuant internals.

This is also the right place to be honest about risk. PyPI currently publishes `turbovec` as version `1.0.0`, but it still carries the classifier `Development Status :: 3 - Alpha`. Use this pattern as a measurable integration path, not as a promise that the library is mature enough for every critical workload.

## What the Sidecar Should Own

The sidecar owns vector-index mechanics:

- Creating and loading TurboVec indexes.
- Converting incoming embeddings to `float32` arrays.
- Mapping stable document IDs to numeric IDs when using `IdMapIndex`.
- Applying allowlist filters for tenant, document type, or ACL candidates.
- Persisting index files safely.
- Exposing health and readiness endpoints.

It should not become the system of record for your documents. Keep source text, access rules, document metadata, and ingestion state in your primary database or object store. The vector index is a retrieval accelerator, not your canonical data model.

## Step 1: A Minimal Python Sidecar

The verified TurboVec Python API uses `IdMapIndex` for stable external IDs. The example below is intentionally small, but it includes the important corrections missing from the old version: real class names, `float32` conversion, a health endpoint, per-tenant locks, filtering, and explicit persistence hooks.

```python
# vector_service/main.py
from pathlib import Path
from threading import Lock

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from turbovec import IdMapIndex

DIMENSIONS = 1536
BIT_WIDTH = 4
INDEX_DIR = Path("/data/vector-indexes")

app = FastAPI()
indexes: dict[str, IdMapIndex] = {}
metadata: dict[str, dict[int, dict[str, str]]] = {}
locks: dict[str, Lock] = {}


class InsertRequest(BaseModel):
    tenant_id: str
    vector_id: int
    document_id: str
    document_type: str
    embedding: list[float]


class SearchRequest(BaseModel):
    tenant_id: str
    embedding: list[float]
    limit: int = Field(default=5, ge=1, le=50)
    document_type: str | None = None


def tenant_path(tenant_id: str) -> Path:
    return INDEX_DIR / f"{tenant_id}.tvim"


def get_lock(tenant_id: str) -> Lock:
    if tenant_id not in locks:
        locks[tenant_id] = Lock()
    return locks[tenant_id]


def get_index(tenant_id: str) -> IdMapIndex:
    if tenant_id in indexes:
        return indexes[tenant_id]

    path = tenant_path(tenant_id)
    if path.exists():
        indexes[tenant_id] = IdMapIndex.load(str(path))
    else:
        indexes[tenant_id] = IdMapIndex(dim=DIMENSIONS, bit_width=BIT_WIDTH)
    metadata.setdefault(tenant_id, {})
    return indexes[tenant_id]


def as_vector(values: list[float]) -> np.ndarray:
    vector = np.asarray(values, dtype=np.float32)
    if vector.shape != (DIMENSIONS,):
        raise HTTPException(status_code=400, detail="Embedding has the wrong dimension")
    return vector.reshape(1, DIMENSIONS)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/insert")
def insert(req: InsertRequest):
    with get_lock(req.tenant_id):
        index = get_index(req.tenant_id)
        vector = as_vector(req.embedding)
        ids = np.asarray([req.vector_id], dtype=np.uint64)
        index.add_with_ids(vector, ids)
        metadata[req.tenant_id][req.vector_id] = {
            "document_id": req.document_id,
            "document_type": req.document_type,
        }
        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        index.sync(str(tenant_path(req.tenant_id)))
    return {"status": "ok"}


@app.post("/search")
def search(req: SearchRequest):
    if req.tenant_id not in indexes and not tenant_path(req.tenant_id).exists():
        return {"results": []}

    index = get_index(req.tenant_id)
    query = as_vector(req.embedding)
    allowed = None

    if req.document_type:
        allowed_ids = [
            vector_id
            for vector_id, item in metadata.get(req.tenant_id, {}).items()
            if item.get("document_type") == req.document_type
        ]
        allowed = np.asarray(allowed_ids, dtype=np.uint64)

    scores, ids = index.search(query, k=req.limit, allowlist=allowed)
    results = []
    for score, vector_id in zip(scores[0], ids[0]):
        item = metadata.get(req.tenant_id, {}).get(int(vector_id))
        if item:
            results.append({
                "document_id": item["document_id"],
                "score": float(score),
            })
    return {"results": results}
```

This is still a starting point. A production service should reload metadata from the primary database, guard against duplicate IDs, define compaction or deletion behavior, expose readiness only after indexes are loaded, and run recovery tests around `sync`, filesystem mounts, and deployment restarts.

## Step 2: Keep TypeScript on an Application Port

Do not put embeddings or vector infrastructure inside your domain model. In a Clean Architecture TypeScript codebase, the dependency should sit at the application boundary:

```typescript
// application/ports/VectorSearchPort.ts
export interface VectorSearchFilter {
  tenantId: string;
  documentType?: 'pdf' | 'wiki' | 'email';
}

export interface VectorSearchResult {
  documentId: string;
  score: number;
}

export interface VectorSearchPort {
  indexDocument(input: {
    tenantId: string;
    vectorId: number;
    documentId: string;
    documentType: string;
    embedding: number[];
  }): Promise<void>;

  search(
    embedding: number[],
    limit: number,
    filter: VectorSearchFilter
  ): Promise<VectorSearchResult[]>;
}
```

This port still knows about embeddings because the use case performs semantic search. What it hides is the infrastructure choice: TurboVec, a managed vector database, exact search, or an in-memory fake for tests.

## Step 3: Implement the HTTP Adapter

The adapter is the only TypeScript class that knows the sidecar exists. Give it a timeout, read the URL from configuration, and validate the response shape before handing data back to the use case.

```typescript
// infrastructure/vector/TurboVecHttpVectorSearch.ts
import {
  VectorSearchFilter,
  VectorSearchPort,
  VectorSearchResult,
} from '../../application/ports/VectorSearchPort';

export class TurboVecHttpVectorSearch implements VectorSearchPort {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 5_000
  ) {}

  async indexDocument(input: {
    tenantId: string;
    vectorId: number;
    documentId: string;
    documentType: string;
    embedding: number[];
  }): Promise<void> {
    const response = await this.post('/insert', {
      tenant_id: input.tenantId,
      vector_id: input.vectorId,
      document_id: input.documentId,
      document_type: input.documentType,
      embedding: input.embedding,
    });

    if (!response.ok) throw new Error(`Vector insert failed with ${response.status}`);
  }

  async search(
    embedding: number[],
    limit: number,
    filter: VectorSearchFilter
  ): Promise<VectorSearchResult[]> {
    const response = await this.post('/search', {
      tenant_id: filter.tenantId,
      document_type: filter.documentType,
      embedding,
      limit,
    });

    if (!response.ok) throw new Error(`Vector search failed with ${response.status}`);

    const body = await response.json();
    if (!Array.isArray(body.results)) throw new Error('Invalid vector search response');

    return body.results.map((item: unknown) => {
      if (!item || typeof item !== 'object') throw new Error('Invalid vector search result');
      const result = item as Record<string, unknown>;
      if (typeof result.document_id !== 'string' || typeof result.score !== 'number') {
        throw new Error('Invalid vector search result');
      }
      return {
        documentId: result.document_id,
        score: result.score,
      };
    });
  }

  private async post(path: string, body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

Add retries only where they are safe. Retrying search is usually fine. Retrying insert can create duplicate work unless the sidecar enforces idempotent IDs or replace semantics.

## Step 4: Use the Port from a Use Case

The use case should still read like application logic:

```typescript
// application/usecases/SearchKnowledgeBase.ts
import { VectorSearchPort, VectorSearchResult } from '../ports/VectorSearchPort';
import { EmbeddingProvider } from '../ports/EmbeddingProvider';

export class SearchKnowledgeBase {
  constructor(
    private readonly embeddings: EmbeddingProvider,
    private readonly vectorSearch: VectorSearchPort
  ) {}

  async execute(input: {
    tenantId: string;
    query: string;
    documentType?: 'pdf' | 'wiki' | 'email';
  }): Promise<VectorSearchResult[]> {
    const query = input.query.trim();
    if (!query) throw new Error('Search query cannot be empty');

    const embedding = await this.embeddings.embed(query);
    return this.vectorSearch.search(embedding, 5, {
      tenantId: input.tenantId,
      documentType: input.documentType,
    });
  }
}
```

The controller extracts HTTP concerns. The use case asks for an embedding and retrieves candidates. The adapter decides how to talk to TurboVec.

## Step 5: Wire It with Docker Compose

Keep the sidecar private and mount durable storage for indexes:

```yaml
services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      VECTOR_SERVICE_URL: http://vector-service:8001
    depends_on:
      vector-service:
        condition: service_healthy

  vector-service:
    build: ./vector_service
    expose:
      - "8001"
    volumes:
      - vector-indexes:/data/vector-indexes
    environment:
      PYTHONUNBUFFERED: "1"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  vector-indexes:
```

`depends_on` with a health condition helps startup order, but it is not a full resilience strategy. The TypeScript adapter should still handle timeouts, failed requests, and sidecar restarts because containers can become unhealthy after startup.

## What This Pattern Does Not Solve

This article covers the vector-search boundary only. A complete RAG system still needs:

- Chunking and ingestion rules.
- Stable numeric IDs for vector storage.
- Source document metadata and access control.
- Embedding model versioning and re-index plans.
- Evaluation for recall and answer quality.
- Citation handling and prompt construction.
- Observability for latency, result count, and failed retrievals.

It also does not remove the need to benchmark. TurboVec's public benchmarks are promising, especially at high dimensions, but you still need your own acceptance threshold for recall, latency, memory, persistence, and restore time.

## When I Would Use It

This pattern is a good fit when:

- You want local or private-network vector search.
- You already have a TypeScript application and do not want vector infrastructure leaking into business logic.
- Your team can maintain a small Python service.
- Your corpus size and recall requirements fit the measured TurboVec profile.
- You are comfortable validating an alpha-classified dependency before production use.

It is a poor fit when:

- You need managed operations, replication, or mature administrative tooling immediately.
- Your team cannot own sidecar deployment and persistence.
- You need hybrid search, filtering, and access control that a mature vector database already solves better.
- You have not measured recall loss at your embedding dimension and bit width.

## Summary

The clean architecture move is not "use TurboVec everywhere." The clean architecture move is to keep vector search behind an application port, put TurboVec in infrastructure, and make the boundary explicit enough that you can replace it.

A Python sidecar is not architectural impurity. In this case, it is the honest boundary: TypeScript owns the product workflow; the sidecar owns compressed vector indexing; the primary database owns documents and permissions.

That gives you a safe path to test TurboVec without betting the whole application on one young library.
