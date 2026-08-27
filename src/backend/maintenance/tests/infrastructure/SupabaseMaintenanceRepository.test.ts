import assert from 'node:assert/strict';
import test from 'node:test';

import { SupabaseMaintenanceRepository } from '../../infrastructure/repositories/supabase/SupabaseMaintenanceRepository.js';

test('deletes old assistant conversations from the admin database', async () => {
  const adminClient = createSupabaseClient({ count: 3 });
  const repository = new SupabaseMaintenanceRepository(adminClient, createSupabaseClient());

  const deleted = await repository.deleteOldAssistantConversations('2026-01-01T00:00:00.000Z');

  assert.equal(deleted, 3);
  assert.deepEqual(adminClient.calls, [
    ['from', 'assistant_conversations'],
    ['delete', { count: 'exact' }],
    ['lt', 'updated_at', '2026-01-01T00:00:00.000Z'],
  ]);
});

test('deletes old visit sessions from the admin database', async () => {
  const adminClient = createSupabaseClient({ count: 5 });
  const repository = new SupabaseMaintenanceRepository(adminClient, createSupabaseClient());

  const deleted = await repository.deleteOldVisitSessions('2026-01-01T00:00:00.000Z');

  assert.deepEqual(deleted, { events: 0, sessions: 5 });
  assert.deepEqual(adminClient.calls, [
    ['from', 'visit_sessions'],
    ['delete', { count: 'exact' }],
    ['lt', 'last_seen_at', '2026-01-01T00:00:00.000Z'],
  ]);
});

test('keeps admin and RAG databases alive', async () => {
  const adminClient = createSupabaseClient();
  const ragClient = createSupabaseClient();
  const repository = new SupabaseMaintenanceRepository(adminClient, ragClient);

  await repository.keepDatabasesAlive();

  assert.deepEqual(ragClient.calls, [
    ['from', 'rag_sources'],
    ['select', 'id'],
    ['limit', 1],
  ]);
  assert.deepEqual(adminClient.calls, [
    ['from', 'outreach_records'],
    ['select', 'id'],
    ['limit', 1],
  ]);
});

function createSupabaseClient({ count = 0, error = null }: { count?: number; error?: Error | null } = {}) {
  const calls: unknown[][] = [];
  const query = {
    delete(options: unknown) {
      calls.push(['delete', options]);
      return query;
    },
    lt(column: string, value: string) {
      calls.push(['lt', column, value]);
      return Promise.resolve({ count, error });
    },
    select(columns: string) {
      calls.push(['select', columns]);
      return query;
    },
    limit(value: number) {
      calls.push(['limit', value]);
      return Promise.resolve({ error });
    },
  };

  return {
    calls,
    from(tableName: string) {
      calls.push(['from', tableName]);
      return query;
    },
  } as any;
}
