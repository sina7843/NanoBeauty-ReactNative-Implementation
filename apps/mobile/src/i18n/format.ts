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

function dateParts(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat('en-US', { ...options, timeZone }).formatToParts(new Date(iso));
  return (type: string) => parts.find((p) => p.type === type)?.value ?? '';
}

/** "Thu 16 Oct" (+ " 2027" outside the current year): visit dates, with the weekday (BV-3). */
export function clinicDay(iso: string, timeZone: string, now: number = Date.now()): string {
  const get = dateParts(iso, timeZone, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${get('weekday')} ${get('day')} ${get('month')}${yearSuffix(iso, timeZone, now)}`;
}

/** "28 Feb 2027": always with the year (receipts, expiries, history). */
export function clinicDateLong(iso: string, timeZone: string): string {
  const get = dateParts(iso, timeZone, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${get('day')} ${get('month')} ${get('year')}`;
}

/** "31 Oct", or "31 Oct 2027" when the date is outside the current year in the clinic's zone. */
export function clinicDate(iso: string, timeZone: string, now: number = Date.now()): string {
  const get = dateParts(iso, timeZone, { day: 'numeric', month: 'short' });
  return `${get('day')} ${get('month')}${yearSuffix(iso, timeZone, now)}`;
}

function yearSuffix(iso: string, timeZone: string, now: number): string {
  const year = dateParts(iso, timeZone, { year: 'numeric' })('year');
  const current = dateParts(new Date(now).toISOString(), timeZone, { year: 'numeric' })('year');
  return year === current ? '' : ` ${year}`;
}

/** "31 Oct, 11:59 pm PT" — expiries are always absolute with timezone (README content rules). `withYear` for receipts ("12 Oct 2026, 10:14 am PT"). */
export function clinicDateTime(iso: string, timeZone: string, withYear = false): string {
  return `${withYear ? clinicDateLong(iso, timeZone) : clinicDate(iso, timeZone)}, ${clinicTime(iso, timeZone)} ${timeZoneLabel(timeZone)}`;
}

/** "25 Sep 2026" for a calendar date (YYYY-MM-DD) such as a policy update. */
export function calendarDate(ymd: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(ymd + 'T12:00:00Z'));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return get('day') + ' ' + get('month') + ' ' + get('year');
}

/** "PT" for the clinic's zone; otherwise the platform's short name. */
export function timeZoneLabel(timeZone: string): string {
  if (TZ_LABEL[timeZone]) return TZ_LABEL[timeZone];
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')?.value;
  return name ?? timeZone;
}
