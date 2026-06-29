---
seoTitle: Adding Vector Search to TypeScript Clean Architecture (Without a Cloud Bill or a RAM Crisis)
slug: adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis
tag: AI
title: Adding Vector Search to TypeScript Clean Architecture (Without a Cloud Bill or a RAM Crisis)
subtitle: At some point, your product manager asks for a feature that sounds deceptively
intro: At some point, your product manager asks for a feature that sounds deceptively
date: June 23, 2026
readTime: 12 min read
mediumUrl: https://ai.plainenglish.io/adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis-1e9104ab278b
excerpt: At some point, your product manager asks for a feature that sounds deceptively
---

![Adding Vector Search to TypeScript Clean Architecture (Without a Cloud Bill or a RAM Crisis)](/images/blog/adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis/adding-vector-search-to-typescript-clean-architecture-without-a-cloud-bill-or-a-ram-crisis-header.webp) At some point, your product manager asks for a feature that sounds deceptively simple: > “Can we make our app answer questions based on our own documents?” This is called Retrieval-Augmented Generation (RAG) - a technique where, instead of relying on an AI’s pre-trained knowledge alone, you first search your database for relevant content, then hand that content to the AI as context. The result is an AI that can answer questions about your data, not just the public internet. To build this, you need a vector database, a special kind of database that stores documents not as plain text but as mathematical representations called embeddings. When a user asks a question, you convert that question into an embedding too and then find the documents whose embeddings are mathematically closest to it. Closest in this space means most semantically similar. It is a powerful idea, but it comes with a painful infrastructure cost. ## The Two Bad Options Everyone Knows - The Cloud Tax: You use a managed vector database like Pinecone or Weaviate. It works well, but now your application is making external HTTP calls to a third-party service, without proper abstraction, your application can become coupled to a vendor SDK, and you are paying per query on top of your existing infrastructure budget.
- The Local RAM Hog: You run something like Qdrant or Milvus locally in Docker. Serious tools, but a 10-million-document vector index stored in standard float32 format can consume over 30 GB of RAM just to sit idle. For most teams, that blows up the deployment budget before the feature ships. ## What Changed Recently As we covered in a previous article, researchers including Google Research scientist Vahab Mirrokni introduced TurboQuant at ICLR 2026, a vector quantization technique designed to compress high-dimensional embeddings while preserving nearest-neighbor search quality. An open-source implementation, TurboVec, makes these ideas practical for production vector search systems. The headline benchmark is compelling: a 10-million-vector dataset that occupies roughly 31 GB in standard float32 form can be compressed to around 4 GB, while published recall metrics remain close to uncompressed baselines. For teams building Retrieval-Augmented Generation (RAG) systems, that kind of reduction can dramatically lower infrastructure requirements without sacrificing search quality. There is one catch for TypeScript and .NET developers: TurboVec ships with Python bindings, not Node.js bindings. No turbovec-node npm package exists today. This article is about how to get the benefits of TurboVec in a TypeScript backend anyway, and why the solution, a small Python sidecar service, arguably produces a cleaner architecture than a native package would. ## The Architecture: A Sidecar, Not a Dependency The approach is straightforward. Instead of calling TurboVec directly from TypeScript, we wrap it in a tiny Python service, about 30 lines of FastAPI code, that exposes a simple HTTP API. Our TypeScript application then talks to that service through a clean domain interface. ```text TypeScript Application Controller → Handler → IVectorRepo HTTP (internal) Python Sidecar FastAPI → TurboVec Index ``` This might sound like more work than a single npm package, but consider what you get: - The sidecar is 10–30 lines of Python. It is not a complex service to maintain.
- Your TypeScript domain has zero knowledge of Python, TurboVec, or vector math. It just calls an interface.
- When (not if) Node.js bindings eventually exist for TurboVec, or you want to try a different vector engine entirely, you change one file in your infrastructure layer, nothing else.
- The separation is honest about what is actually happening. Vector search is a separate concern. Treating it as one makes the system easier to reason about. Let us build it step by step. ## Step 1: The Sidecar, The TurboVec Python Service The entire vector search capability lives here. This service has two jobs: store embeddings, and search them. For simplicity the example keeps indexes in memory. Production deployments should persist indexes to disk or object storage and reload them during startup: ```typescript
# vector_service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import turbovec
import uvicorn app = FastAPI()
# A separate in-memory index per tenant keeps data isolated.
# In production you would persist these to disk.
indexes: dict[str, turbovec.Index] = {}
def get_or_create_index(tenant_id: str) -> turbovec.Index:
if tenant_id not in indexes:
# 4-bit quantization: strong compression, minimal recall loss
# at the embedding dimensions used by modern models (1536+)
indexes[tenant_id] = turbovec.Index(dims=1536, bits=4)
return indexes[tenant_id]
class InsertRequest(BaseModel):
id: str
tenant_id: str
embedding: list[float]
content: str # The original text chunk, stored as metadata
document_type: str
class SearchRequest(BaseModel):
tenant_id: str
embedding: list[float]
limit: int = 5
@app.post("/insert")
def insert(req: InsertRequest):
index = get_or_create_index(req.tenant_id)
index.add(req.id, req.embedding, {"content": req.content, "type": req.document_type})
return {"status": "ok"}
@app.post("/search")
def search(req: SearchRequest):
if req.tenant_id not in indexes:
return {"results": []}
index = indexes[req.tenant_id]
raw = index.search(req.embedding, req.limit)
return {
"results": [
{
"id": r.id,
"content": r.metadata["content"],
"similarity_score": r.score
}
for r in raw
]
}
if __name__ == "__main__":
uvicorn.run(app, host="0.0.0.0", port=8001)
``` A few things worth noting here: Why separate indexes per tenant? In a SaaS application, different customers must never see each other’s data. Keeping a dedicated index per tenant_id enforces that isolation at the data structure level, not just at query time. It is the simplest and most reliable approach. What is an “embedding dimension”? When you use an embedding model (like OpenAI’s text-embedding-3-small), it converts a piece of text into a list of numbers - the embedding. The length of that list is the dimension. OpenAI's models produce 1536-dimensional embeddings. The index needs to know this upfront because TurboVec's compression math is tied to the dimensionality. Why 4-bit? TurboVec supports both 2-bit and 4-bit quantization. At the embedding sizes used by modern models (1536+ dimensions), 4-bit gives an excellent balance: strong compression with recall quality essentially indistinguishable from full float32 for most real-world use cases. At lower dimensions (like 200), there is more noticeable recall degradation and you may want to test both settings against your specific data. ## Step 2: The Domain Contract, The TypeScript Interface Back in TypeScript, we define what vector search means to our application, using the language of our business domain. No mention of Python, HTTP, embeddings, or quantization. ```typescript
// domain/interfaces/IVectorRepository.ts
export interface SearchFilter {
tenantId: string;
documentType?: 'pdf' | 'wiki' | 'email';
}
export interface DocumentSnippet {
id: string;
content: string;
similarityScore: number;
}
export interface IVectorRepository {
insert(id: string, embedding: number[], metadata: {
tenantId: string;
content: string;
documentType: string;
}): Promise<void>;
search(
embedding: number[],
limit: number,
filters: SearchFilter
): Promise<DocumentSnippet[]>;
}
``` This interface is the protective boundary of your architecture. It describes what you want the capability to do in plain domain terms. Anything that satisfies this contract - a real sidecar, an in-memory mock, a future native binding - can be plugged in without touching a single line of business logic. This is also what makes unit testing clean. In your CI pipeline, you inject a simple mock that returns hardcoded results. No sidecar, no Docker, no network. Your business logic tests run in milliseconds. ## Step 3: The Infrastructure Layer, Calling the Sidecar Now we implement the interface. This is the only place in the codebase that knows a Python service exists. ```typescript
// infrastructure/repositories/TurboVecRepository.ts
import { IVectorRepository, SearchFilter, DocumentSnippet } from '../../domain/interfaces/IVectorRepository'; export class TurboVecRepository implements IVectorRepository {
private readonly baseUrl: string;
constructor(baseUrl: string = 'http://vector-service:8001') {
this.baseUrl = baseUrl;
}
async insert(
id: string,
embedding: number[],
metadata: { tenantId: string; content: string; documentType: string }
): Promise<void> {
const response = await fetch(`${this.baseUrl}/insert`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
id,
tenant_id: metadata.tenantId,
embedding,
content: metadata.content,
document_type: metadata.documentType,
}),
});
if (!response.ok) {
throw new Error(`Vector insert failed: ${response.statusText}`);
}
}
async search(
embedding: number[],
limit: number,
filters: SearchFilter
): Promise<DocumentSnippet[]> {
const response = await fetch(`${this.baseUrl}/search`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
tenant_id: filters.tenantId,
embedding,
limit,
}),
});
if (!response.ok) {
throw new Error(`Vector search failed: ${response.statusText}`);
}
const data = await response.json();
return data.results;
}
}
``` Notice what is not here: no TurboVec-specific types, no quantization configuration, no Python concepts. This class speaks only in the terms defined by your domain interface. If you swapped the sidecar for a cloud-hosted Pinecone instance tomorrow, you would rewrite this one file and nothing else in your application would need to change. ## Step 4: The Application Layer, The Query Handler With the boundary in place, the application logic that handles a user’s search request is clean and focused entirely on business rules. ```typescript
// application/queries/SearchKnowledgeBaseHandler.ts
import { IVectorRepository, DocumentSnippet } from '../../domain/interfaces/IVectorRepository';
import { IEmbeddingProvider } from '../../domain/interfaces/IEmbeddingProvider'; export class SearchKnowledgeBaseHandler {
constructor(
private readonly vectorRepo: IVectorRepository,
private readonly embeddingProvider: IEmbeddingProvider
) {}
async handle(query: string, tenantId: string): Promise<DocumentSnippet[]> {
if (!query?.trim()) {
throw new Error('Search query cannot be empty');
}
// Step 1: Convert the user's text question into a vector embedding.
// This is what makes the search "semantic" - it finds meaning, not just keywords.
const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);
// Step 2: Find the most relevant document chunks in our vector index.
// The handler has no idea this involves a Python sidecar - and it shouldn't.
const topResults = await this.vectorRepo.search(queryEmbedding, 5, { tenantId });
return topResults;
}
}
``` IEmbeddingProvider follows the same pattern as IVectorRepository,it is another domain interface that hides the details of which embedding model you are using (OpenAI, a local ONNX model, Cohere, etc.). Your handler stays portable across infrastructure choices. ## Step 5: The API Boundary The controller handles the HTTP request and delegates everything else. ```typescript
// api/controllers/SearchController.ts
import { Request, Response } from 'express';
import { SearchKnowledgeBaseHandler } from '../../application/queries/SearchKnowledgeBaseHandler';
export class SearchController {
constructor(private readonly searchHandler: SearchKnowledgeBaseHandler) {}
async searchDocuments(req: Request, res: Response) {
const { query } = req.body;
const tenantId = req.user.tenantId; // Extracted by auth middleware
const results = await this.searchHandler.handle(query, tenantId);
return res.status(200).json({ data: results });
}
}
``` Three layers, each with one responsibility. The controller knows about HTTP. The handler knows about the business rules. The repository knows about the infrastructure. None of them leak into each other. ## Step 6: Wiring It All Together with Docker Compose Here is where the sidecar pattern becomes concrete. Your deployment is two containers, coordinated by a single compose file. ```bash
# docker-compose.yml
services:
api:
build: ./api
ports:
- "3000:3000"
environment:
VECTOR_SERVICE_URL: http://vector-service:8001
depends_on:
- vector-service
vector-service:
build: ./vector_service
# No external ports exposed - internal traffic only.
# Your TypeScript API talks to it, nothing else.
expose:
- "8001"
environment:
- PYTHONUNBUFFERED=1
``` The vector service is deliberately not exposed on a public port. It is internal infrastructure. Your TypeScript API is the only thing that talks to it, and it does so over Docker’s internal network, not the public internet. The Python image with TurboVec installed is small, a few hundred megabytes. The TurboVec index itself, thanks to the quantization, is a fraction of what a traditional vector store would require. Both containers together will use less RAM than a single Qdrant container at idle. ## The Full Picture Here is how a user search flows through the entire system: ```text
User types: "How do I reset my password?" SearchController (HTTP layer) extracts query + tenantId SearchKnowledgeBaseHandler (business logic) validates input IEmbeddingProvider.generateEmbedding() converts text → [0.12, -0.83, 0.44, ...] (1536 numbers) IVectorRepository.search() (HTTP, internal network)
TurboVec Python Sidecar applies random rotation to query vector scores against 4-bit compressed document embeddings returns top 5 most similar chunks Handler returns DocumentSnippet[] Controller sends JSON response
``` Everything inside the TypeScript box is pure domain logic. Everything inside the Python box is pure infrastructure. The HTTP boundary between them is explicit, testable, and replaceable. ## A Note on Recall Quality Because this article is aimed at all developers, not just ML engineers, it is worth being honest about what “compression” means for search quality. When TurboVec compresses a vector from float32 down to 4 bits per dimension, it is making an approximation. The compressed version is not perfectly identical to the original. This means search results are approximate, you might occasionally miss a highly relevant document, or rank one slightly above another when their true similarity is very close. In practice, for the dimensions modern embedding models use (1536 and above), this approximation is very close to the information-theoretic limit of what is mathematically possible at that compression ratio. Published benchmarks show recall remaining very close to uncompressed baselines at these dimensions, making the impact on retrieval quality negligible for many real-world workloads. At lower embedding dimensions (200 or below, such as older GloVe embeddings), the approximation is more noticeable. If you are using an older or lighter embedding model, test your specific recall requirements before going to production. You can always drop to a smaller index or use exact search for a fallback on critical queries. The short version: for any modern embedding model, you are unlikely to notice a difference. But it is worth knowing the trade-off exists. ## When to Use This Pattern This architecture makes sense when: - You are building a RAG feature into an existing TypeScript or .NET application.
- You want to keep infrastructure costs low without sacrificing search quality.
- You need multi-tenant data isolation.
- You want to be able to swap the vector backend in the future without rewriting your application. It is not the right choice if: - You need to search hundreds of millions of vectors (at that scale, a managed service with dedicated infrastructure is worth the cost).
- Your team has zero Python experience and no appetite for maintaining even a small Python service.
- You need sub-millisecond latency on searches (the internal HTTP hop adds a small but real overhead). ## Summary TurboVec brings genuinely impressive compression to vector search, but it only ships with Python bindings today. Rather than waiting for a Node.js package, or pretending one exists, we used a small Python sidecar as the honest infrastructure it is, and wrapped it behind a domain interface so our TypeScript application stays completely unaware of the implementation details. The result is an architecture where: - Your domain is clean. The TypeScript application core uses interfaces and knows nothing about Python, TurboVec, or quantization math.
- Your infrastructure is replaceable. One file changes if the vector backend changes.
- Your deployment is lightweight. Two small containers, no bloated services, no cloud fees.
- Your tests are fast. Mock the IVectorRepository interface in CI and your business logic tests run without any external dependencies. Clean Architecture does not mean your vector database has to run in the same process as your application. Sometimes the cleanest thing is an honest boundary.
