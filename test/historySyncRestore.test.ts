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

test('fetches the first page using a legacy cached WhatsApp LID', async () => {
  const service = Object.create(BaileysStartupService.prototype);
  const phone = '10@s.whatsapp.net';
  const lid = '20@lid';
  const key = { id: 'oldest', remoteJid: phone, fromMe: false };
  const messageTimestamp = 1_765_000_000;
  Object.assign(service, {
    instance: { id: 'synthetic-line' },
    prismaRepository: {
      message: {
        async findFirst({ where }: { where: Record<string, unknown> }) {
          assert.deepEqual(where, {
            instanceId: 'synthetic-line',
            messageTimestamp,
            AND: [
              { key: { path: ['id'], equals: 'oldest' } },
              { OR: [
                { key: { path: ['remoteJid'], equals: phone } },
                { key: { path: ['remoteJidAlt'], equals: phone } },
              ] },
            ],
          });
          return { key: { ...key, remoteJidAlt: lid, addressingMode: 'lid' } };
        },
      },
    },
    client: {
      async fetchMessageHistory(count: number, cursor: typeof key, timestampMs: number) {
        assert.equal(count, 100);
        assert.deepEqual(cursor, { ...key, remoteJid: lid });
        assert.equal(timestampMs, messageTimestamp * 1000);
        return 'synthetic-request';
      },
    },
  });

  assert.deepEqual(await service.fetchMessageHistory({ count: 100, key, messageTimestamp }), {
    status: 'requested',
    requestId: 'synthetic-request',
    count: 100,
    remoteJid: lid,
  });
});

test('preserves the original LID when normalizing an incoming message key', async () => {
  const service = Object.create(BaileysStartupService.prototype);
  const phone = '10@s.whatsapp.net';
  const lid = '20@lid';
  service.client = { signalRepository: { lidMapping: { storeLIDPNMappings: async () => undefined } } };
  const raw = { id: 'oldest', remoteJid: lid, remoteJidAlt: phone };
  assert.deepEqual(await service.normalizeMessageKey(raw), {
    id: 'oldest',
    remoteJid: phone,
    remoteJidAlt: lid,
    historyRemoteJid: lid,
  });
});
