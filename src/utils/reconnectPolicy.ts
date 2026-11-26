import { DisconnectReason } from 'baileys';

export const MAX_RECONNECT_ATTEMPTS = 6;

export function shouldReconnect(statusCode?: number) {
  return ![DisconnectReason.loggedOut, DisconnectReason.forbidden, 402, 406].includes(statusCode);
}

export function reconnectDelayMs(attempt: number) {
  return Math.min(30000, 1000 * 2 ** Math.min(attempt, 5));
}
