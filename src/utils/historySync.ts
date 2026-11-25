import { Browsers, WABrowserDescription } from 'baileys';

export function historySyncBrowser(syncFullHistory: boolean, configured: WABrowserDescription): WABrowserDescription {
  return syncFullHistory ? Browsers.macOS('Desktop') : configured;
}

// WhatsApp messages carry Unix seconds. Baileys forwards this argument unchanged to oldestMsgTimestampMs.
export function historyTimestampMs(timestamp: number): number {
  return Math.floor(timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp);
}
