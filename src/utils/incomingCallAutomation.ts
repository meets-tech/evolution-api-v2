import { createHash } from 'crypto';

export interface IncomingCallActionCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds?: number): unknown;
}

export interface IncomingCallAutomationInput {
  callId: string;
  status: string;
  rejectEnabled: boolean;
  messageEnabled: boolean;
  reject: () => Promise<unknown>;
  sendMessage: () => Promise<unknown>;
  retryDelaysMs?: number[];
}

const ACTION_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_RETRY_DELAYS_MS = [250, 750];

export function incomingCallMessageId(callId: string): string {
  return createHash('sha256').update(`incoming-call:${callId}`).digest('hex').slice(0, 32).toUpperCase();
}

export async function processIncomingCallAutomation(
  input: IncomingCallAutomationInput,
  cache: IncomingCallActionCache,
): Promise<void> {
  if (input.status !== 'offer') return;

  const actions: Promise<unknown>[] = [];
  if (input.rejectEnabled) {
    actions.push(
      runActionOnce(cache, `${input.callId}:rejected`, input.reject, input.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS),
    );
  }
  if (input.messageEnabled) {
    actions.push(
      runActionOnce(
        cache,
        `${input.callId}:message-sent`,
        input.sendMessage,
        input.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS,
      ),
    );
  }

  const results = await Promise.allSettled(actions);
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

async function runActionOnce(
  cache: IncomingCallActionCache,
  key: string,
  action: () => Promise<unknown>,
  retryDelaysMs: number[],
): Promise<void> {
  if (cache.get<boolean>(key)) return;

  await runWithRetry(action, retryDelaysMs);
  cache.set(key, true, ACTION_TTL_SECONDS);
}

async function runWithRetry(action: () => Promise<unknown>, retryDelaysMs: number[]): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await action();
      return;
    } catch (error) {
      const retryDelay = retryDelaysMs[attempt];
      if (retryDelay === undefined) throw error;
      if (retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
}
