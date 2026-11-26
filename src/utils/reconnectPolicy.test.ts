import assert from 'node:assert/strict';
import test from 'node:test';

import { DisconnectReason } from 'baileys';

import { MAX_RECONNECT_ATTEMPTS, reconnectDelayMs, shouldReconnect } from './reconnectPolicy';

test('aplica espera progressiva limitada para quedas temporárias', () => {
  assert.equal(MAX_RECONNECT_ATTEMPTS, 6);
  assert.equal(reconnectDelayMs(0), 1000);
  assert.equal(reconnectDelayMs(1), 2000);
  assert.equal(reconnectDelayMs(5), 30000);
  assert.equal(reconnectDelayMs(10), 30000);
});

test('não reconecta sessões explicitamente encerradas', () => {
  assert.equal(shouldReconnect(DisconnectReason.loggedOut), false);
  assert.equal(shouldReconnect(DisconnectReason.forbidden), false);
  assert.equal(shouldReconnect(503), true);
});
