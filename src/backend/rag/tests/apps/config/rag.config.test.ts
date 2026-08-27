import assert from 'node:assert/strict';
import test from 'node:test';

import { RagConfig } from '../../../apps/config/rag.config.js';

test('loads RAG configuration from environment with defaults', () => {
  RagConfig.reset();

  try {
    const config = RagConfig.load({
      RAG_DATABASE_URL: 'https://rag-project.supabase.co',
      RAG_DATABASE_SERVICE_ROLE_KEY: 'service-role-key',
      EMBEDDING_API_KEY: 'embedding-api-key',
      EMBEDDING_MODEL: 'embedding-model',
      FALLBACK_EMBEDDING_MODEL: 'fallback-embedding-model',
      AI_MODEL_API_KEY: 'ai-model-api-key',
      AI_MODEL: 'ai-model',
      ALTCHA_HMAC_KEY: 'altcha-hmac-key',
    });

    assert.equal(config.getDatabaseUrl(), 'https://rag-project.supabase.co');
    assert.deepEqual(config.getSiteConfig(), {
      siteUrl: 'https://arg.software',
      companyName: 'ARG Software',
    });
    assert.deepEqual(config.getChunkingConfig(), {
      chunkSize: 1200,
      chunkOverlap: 180,
    });
    assert.deepEqual(config.getRetrievalConfig(), {
      matchCount: 6,
      similarityThreshold: 0.72,
      fallbackSimilarityThreshold: 0.6,
    });
    assert.deepEqual(config.getAltchaSettings(), {
      altchaHmacKey: 'altcha-hmac-key',
      altchaCost: 2000,
      altchaCounterMin: 1000,
      altchaCounterMax: 3000,
    });
    assert.deepEqual(config.getAskRateLimitConfig(), {
      perMinute: 6,
      perDay: 30,
      globalDaily: 500,
      salt: 'arg-ask-rate-limit',
    });
  } finally {
    RagConfig.reset();
  }
});

test('throws configuration errors for missing required RAG environment', () => {
  RagConfig.reset();

  try {
    assert.throws(() => RagConfig.load({}), {
      code: 'configuration_error',
      statusCode: 503,
    });
  } finally {
    RagConfig.reset();
  }
});
