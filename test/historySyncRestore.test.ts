import assert from 'node:assert/strict';
import test from 'node:test';

import { BaileysStartupService } from '../src/api/integrations/channel/whatsapp/whatsapp.baileys.service';

test('a restored instance waits for its history preference before creating the socket', async () => {
  let resolveSettings: (settings: { syncFullHistory: boolean }) => void;
  const settings = new Promise<{ syncFullHistory: boolean }>((resolve) => {
    resolveSettings = resolve;
  });
  const service = Object.create(BaileysStartupService.prototype);
  const socketPreferences: boolean[] = [];
  Object.assign(service, {
    instance: { id: 'history-test' },
    localSettings: {},
    prismaRepository: { setting: { findUnique: () => settings } },
    loadChatwoot() {},
    loadWebhook() {},
    loadProxy() {},
    messageProcessor: { mount() {} },
    messageHandle: { 'messages.upsert'() {} },
    createClient() {
      socketPreferences.push(service.localSettings.syncFullHistory);
    },
  });
  const connection = service.connectToWhatsapp();
  assert.deepEqual(socketPreferences, []);
  resolveSettings!({ syncFullHistory: true });
  await connection;
  assert.deepEqual(socketPreferences, [true]);
});
