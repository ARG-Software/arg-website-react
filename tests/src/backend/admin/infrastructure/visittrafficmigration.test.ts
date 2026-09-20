import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migration = readFileSync(
  resolve(
    'supabase/admin/migrations/20260920000000_add_visit_traffic_classification.sql'
  ),
  'utf8'
);

test('visit traffic migration preserves normalized analytics writes', () => {
  assert.match(migration, /insert into public\.visit_page_views/u);
  assert.match(migration, /insert into public\.visit_events/u);
});

test('visit traffic migration keeps the deployed recorder overload available', () => {
  assert.doesNotMatch(
    migration,
    /drop function if exists public\.record_visit_session\(text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb/u
  );
});
