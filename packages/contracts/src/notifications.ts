import { z } from 'zod';

// NANO-09 notifications (spec 3, NOTIF 01–07), devices, analytics consent and telemetry redaction.

/** NTF-01–12 (spec 3). Channels are the approved set per template; delivery honours preferences and quiet hours. */
export const NTF_IDS = ['NTF-01', 'NTF-02', 'NTF-03', 'NTF-04', 'NTF-05', 'NTF-06', 'NTF-07', 'NTF-08', 'NTF-09', 'NTF-10', 'NTF-11', 'NTF-12'] as const;
export type NtfId = (typeof NTF_IDS)[number];
export const channelSchema = z.enum(['push', 'sms', 'email']);
export type Channel = z.infer<typeof channelSchema>;

export const deviceRegisterSchema = z.object({
  /** Push token from the platform push service (Expo push token today). Never logged. */
  token: z.string().min(10).max(300),
  platform: z.enum(['ios', 'android']),
});

/** ACC-06 "Help improve the app": the opt-in for usage analytics (spec 4). Essential events don't need it. */
export const analyticsConsentSchema = z.object({ granted: z.boolean() });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATTERNS: [RegExp, string | ((m: string) => string)][] = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  // North American numbers in the usual shapes: +1 604 555 0123, (604) 555-0123, 6045550123.
  [/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[phone]'],
  // Session/refresh tokens and other long secrets; record IDs (UUIDs) stay so a report can be traced.
  [/\b[A-Za-z0-9_-]{32,}\b/g, (m) => (UUID.test(m) ? m : '[token]')],
  // Gift codes (12 characters) and one-time codes (6 digits).
  [/\b[A-Z0-9]{12}\b/g, '[code]'],
  [/\b\d{6}\b/g, '[code]'],
];

/** Removes contact details, codes and credentials from text bound for logs, crash reports or analytics. */
export function redactText(text: string): string {
  return PATTERNS.reduce((s, [re, to]) => s.replace(re, to as string), text);
}
