import { en } from './en';

// English-only launch (D12); every user-facing string goes through t() so another locale is a new
// file, not a code change (NFR 13). Use Intl for currency/date/plural formatting, never string math.
export type StringKey = keyof typeof en;

export function t(key: StringKey, params: Record<string, string | number> = {}): string {
  return en[key].replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export const locale = 'en-CA';
