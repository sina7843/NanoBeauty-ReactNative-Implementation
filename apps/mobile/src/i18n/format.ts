import { locale } from './index';

// Currency, date and time go through Intl — never string concatenation (NFR 13).
const CAD = new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' });

/** "$1,250.00" */
export function money(amount: number): string {
  return CAD.format(amount).replace(/^CA\$/, '$');
}

const TZ_LABEL: Record<string, string> = { 'America/Vancouver': 'PT' };

/** Clinic-local time in house style: "11 pm", "2:30 pm" (README content rules). */
export function clinicTime(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const minute = get('minute');
  return `${get('hour')}${minute === '00' ? '' : `:${minute}`} ${get('dayPeriod').toLowerCase()}`;
}

/** "PT" for the clinic's zone; otherwise the platform's short name. */
export function timeZoneLabel(timeZone: string): string {
  if (TZ_LABEL[timeZone]) return TZ_LABEL[timeZone];
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')?.value;
  return name ?? timeZone;
}
