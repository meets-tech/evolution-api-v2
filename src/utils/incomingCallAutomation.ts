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
}

const ACTION_TTL_SECONDS = 24 * 60 * 60;

export async function processIncomingCallAutomation(
  input: IncomingCallAutomationInput,
  cache: IncomingCallActionCache,
): Promise<void> {
  if (input.status !== 'offer') return;

  const actions: Promise<unknown>[] = [];
  if (input.rejectEnabled) {
    actions.push(runActionOnce(cache, `${input.callId}:rejected`, input.reject));
  }
  if (input.messageEnabled) {
    actions.push(runActionOnce(cache, `${input.callId}:message-sent`, input.sendMessage));
  }

  const results = await Promise.allSettled(actions);
  const failure = results.find((result) => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

async function runActionOnce(
  cache: IncomingCallActionCache,
  key: string,
  action: () => Promise<unknown>,
): Promise<void> {
  if (cache.get<boolean>(key)) return;

  await action();
  cache.set(key, true, ACTION_TTL_SECONDS);
}
