import assert from 'node:assert/strict';
import test from 'node:test';
import {
  toContentDateIso,
  toContentDateOnly,
} from '../../../../../src/frontend/utils/contentDate.js';

test('parses written blog dates as UTC date-only values', () => {
  assert.equal(toContentDateIso('September 19, 2026'), '2026-09-19T00:00:00.000Z');
  assert.equal(toContentDateOnly('September 19, 2026'), '2026-09-19');
});

test('rejects invalid content dates', () => {
  assert.equal(toContentDateIso('not a date'), '');
  assert.equal(toContentDateOnly('not a date'), '');
});
