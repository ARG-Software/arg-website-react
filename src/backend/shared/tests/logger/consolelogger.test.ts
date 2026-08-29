import assert from 'node:assert/strict';
import test from 'node:test';

import { ConsoleLogger } from '../../logger/console.logger.js';
import { runWithLogContext } from '../../logger/logcontext.js';

test('ConsoleLogger includes async log context and redacts sensitive fields', () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (message?: unknown) => {
    logs.push(String(message));
  };

  try {
    runWithLogContext({ requestId: 'req-test', service: 'admin' }, () => {
      new ConsoleLogger().info('test message', {
        operation: 'test_operation',
        password: 'secret',
        accessToken: 'token',
        emailBody: 'private body',
      });
    });
  } finally {
    console.log = originalLog;
  }

  const entry = JSON.parse(logs[0]);
  assert.equal(entry.requestId, 'req-test');
  assert.equal(entry.service, 'admin');
  assert.equal(entry.operation, 'test_operation');
  assert.equal(entry.password, '[redacted]');
  assert.equal(entry.accessToken, '[redacted]');
  assert.equal(entry.emailBody, '[redacted]');
});
