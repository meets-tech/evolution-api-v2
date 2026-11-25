import assert from 'node:assert/strict';
import test from 'node:test';

import { Browsers, generateLoginNode, proto, WABrowserDescription } from 'baileys';

import { historyCursorKey, historySyncBrowser, historyTimestampMs, unpersistedHistoryMessages } from '../src/utils/historySync';

test('full-history QR login advertises a desktop companion to WhatsApp', () => {
  const configured: WABrowserDescription = ['Evolution API', 'Chrome', '1'];
  const browser = historySyncBrowser(true, configured);
  const login = generateLoginNode('123:1@s.whatsapp.net', { browser, syncFullHistory: true, version: [2, 3000, 1] } as never);
  assert.deepEqual(browser, Browsers.macOS('Desktop'));
  assert.equal(login.webInfo.webSubPlatform, proto.ClientPayload.WebInfo.WebSubPlatform.DARWIN);
  assert.deepEqual(historySyncBrowser(false, configured), configured);
});

test('on-demand cursors keep the message date in the millisecond field accepted by Baileys', () => {
  const milliseconds = Date.parse('2026-11-25T12:00:00Z');
  for (const timestamp of [milliseconds / 1000, milliseconds, milliseconds + 123]) {
    const expected = timestamp < milliseconds ? milliseconds : timestamp;
    assert.equal(historyTimestampMs(timestamp), expected);
  }
});

test('on-demand cursors retain the original chat address after phone number normalization', () => {
  const key = { id: 'first', remoteJid: '10@s.whatsapp.net', fromMe: false };
  assert.deepEqual(historyCursorKey(key), key);
  assert.deepEqual(historyCursorKey({ ...key, historyRemoteJid: '20@lid' }), {
    ...key,
    remoteJid: '20@lid',
    historyRemoteJid: '20@lid',
  });
});


test('overlapping history pages keep all webhook records and only insert new WhatsApp keys', () => {
  const key = { id: 'first', remoteJid: '10@s.whatsapp.net', remoteJidAlt: '20@lid', fromMe: false };
  const next = { key: { ...key, id: 'next' } };
  const page = [{ key }, next, next];
  const stored = [{ ...key, remoteJid: '20@lid', remoteJidAlt: undefined }];
  const pending = unpersistedHistoryMessages('line', page, stored);
  assert.deepEqual(pending.map((row) => row.key.id), ['next']);
  assert.equal(page.length, 3);
  assert.deepEqual(unpersistedHistoryMessages('line', [next], []), pending);
  assert.notEqual(unpersistedHistoryMessages('another-line', [next], [])[0].id, pending[0].id);
  assert.deepEqual(unpersistedHistoryMessages('line', page, [...stored, next.key]), []);
});
