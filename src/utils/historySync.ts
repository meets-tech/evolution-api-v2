import { createHash } from 'node:crypto';

import { Browsers, WABrowserDescription } from 'baileys';

export function historySyncBrowser(syncFullHistory: boolean, configured: WABrowserDescription): WABrowserDescription {
  return syncFullHistory ? Browsers.macOS('Desktop') : configured;
}

// WhatsApp messages carry Unix seconds. Baileys forwards this argument unchanged to oldestMsgTimestampMs.
export function historyTimestampMs(timestamp: number): number {
  return Math.floor(timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp);
}

type HistoryKey = {
  id?: string | null;
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
  fromMe?: boolean | null;
};

export function unpersistedHistoryMessages<T extends { key: HistoryKey }>(
  instanceId: string,
  messages: T[],
  storedKeys: HistoryKey[],
): (T & { id: string })[] {
  const identities = (key: HistoryKey) =>
    [key.remoteJid, key.remoteJidAlt]
      .filter(Boolean)
      .map((jid) => JSON.stringify([instanceId, jid, !!key.fromMe, key.id]));
  const seen = new Set(storedKeys.flatMap(identities));
  const pending: (T & { id: string })[] = [];
  for (const message of messages) {
    const keys = identities(message.key);
    if (!message.key.id || !keys.length || keys.some((key) => seen.has(key))) continue;
    for (const key of keys) seen.add(key);
    // The normalized primary JID and the WhatsApp key are stable across concurrent retries.
    const id = createHash('sha256').update(keys[0]).digest('hex');
    pending.push({ ...message, id });
  }
  return pending;
}
