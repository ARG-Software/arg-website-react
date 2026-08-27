import assert from 'node:assert/strict';
import test from 'node:test';

import { keepDatabaseAlive, keepDatabasesAlive } from '../../maintenance/keepDatabaseAlive.ts';

test('touches the configured Supabase table', async () => {
  const calls = [];
  const supabase = {
    from(tableName) {
      calls.push(['from', tableName]);
      return {
        select(select) {
          calls.push(['select', select]);
          return {
            limit(limit) {
              calls.push(['limit', limit]);
              return { error: null };
            },
          };
        },
      };
    },
  };

  await keepDatabaseAlive({ supabase, tableName: 'outreach_records' });

  assert.deepEqual(calls, [
    ['from', 'outreach_records'],
    ['select', 'id'],
    ['limit', 1],
  ]);
});

test('throws Supabase keep-alive errors', async () => {
  const error = new Error('database unavailable');
  const supabase = {
    from() {
      return {
        select() {
          return {
            limit() {
              return { error };
            },
          };
        },
      };
    },
  };

  await assert.rejects(() => keepDatabaseAlive({ supabase, tableName: 'rag_sources' }), error);
});

test('touches multiple configured Supabase databases', async () => {
  const touchedTables = [];

  await keepDatabasesAlive([
    { supabase: createSupabaseRecorder(touchedTables), tableName: 'rag_sources' },
    { supabase: createSupabaseRecorder(touchedTables), tableName: 'outreach_records' },
  ]);

  assert.deepEqual(touchedTables.sort(), ['outreach_records', 'rag_sources']);
});

function createSupabaseRecorder(touchedTables) {
  return {
    from(tableName) {
      touchedTables.push(tableName);

      return {
        select() {
          return {
            limit() {
              return { error: null };
            },
          };
        },
      };
    },
  };
}
