import assert from 'node:assert/strict';
import test from 'node:test';
import {
  toContentDateIso,
  toContentDateOnly,
  toShortContentDate,
} from '../../../../../src/frontend/utils/contentDate.js';

test('parses written blog dates as UTC date-only values', () => {
  assert.equal(toContentDateIso('September 19, 2026'), '2026-09-19T00:00:00.000Z');
  assert.equal(toContentDateOnly('September 19, 2026'), '2026-09-19');
});

test('rejects invalid content dates', () => {
  assert.equal(toContentDateIso('not a date'), '');
  assert.equal(toContentDateOnly('not a date'), '');
});

test('formats written blog dates as abbreviated display values', () => {
  assert.equal(toShortContentDate('September 11, 2026'), 'Sep 11, 2026');
  assert.equal(toShortContentDate('August 22, 2026'), 'Aug 22, 2026');
  assert.equal(toShortContentDate('not a date'), 'not a date');
});
