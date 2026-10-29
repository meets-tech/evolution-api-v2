import { isLidUser, isPnUser, jidNormalizedUser, normalizeMessageContent, proto } from 'baileys';

export interface LidAwareMessageKey {
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
  participant?: string | null;
  participantAlt?: string | null;
}

export interface LidPnMapping {
  lid: string;
  pn: string;
}

interface LidMappingStore {
  resolve(lid: string): Promise<string | null>;
  store(pairs: LidPnMapping[]): Promise<void>;
}

export function normalizeBaileysMessageContent(message: proto.IMessage | null | undefined): proto.IMessage | null {
  return normalizeMessageContent(message) ?? message ?? null;
}

function normalized(value: string): string {
  return jidNormalizedUser(value);
}

function mappingFromPair(first?: string | null, second?: string | null): LidPnMapping | null {
  if (!first || !second) return null;

  if (isLidUser(first) && isPnUser(second)) {
    return { lid: normalized(first), pn: normalized(second) };
  }

  if (isPnUser(first) && isLidUser(second)) {
    return { lid: normalized(second), pn: normalized(first) };
  }

  return null;
}

function uniqueMappings(pairs: LidPnMapping[]): LidPnMapping[] {
  const mappings = new Map<string, LidPnMapping>();
  for (const pair of pairs) mappings.set(`${pair.lid}:${pair.pn}`, pair);
  return [...mappings.values()];
}

async function resolvePair(
  first: string | null | undefined,
  second: string | null | undefined,
  store: LidMappingStore,
): Promise<LidPnMapping | null> {
  const supplied = mappingFromPair(first, second);
  if (supplied) return supplied;
  if (!first || !isLidUser(first)) return null;

  const phone = await store.resolve(first);
  return phone && isPnUser(phone) ? { lid: normalized(first), pn: normalized(phone) } : null;
}

export async function normalizeLidMessageKey<T extends LidAwareMessageKey>(key: T, store: LidMappingStore): Promise<T> {
  const normalizedKey = { ...key };
  const remoteMapping = await resolvePair(key.remoteJid, key.remoteJidAlt, store);
  const participantMapping = await resolvePair(key.participant, key.participantAlt, store);
  const mappings = uniqueMappings([remoteMapping, participantMapping].filter((pair): pair is LidPnMapping => !!pair));

  if (mappings.length) await store.store(mappings);

  if (remoteMapping) {
    normalizedKey.remoteJid = remoteMapping.pn;
    normalizedKey.remoteJidAlt = remoteMapping.lid;
  }

  if (participantMapping) {
    normalizedKey.participant = participantMapping.pn;
    normalizedKey.participantAlt = participantMapping.lid;
  }

  return normalizedKey;
}
