import type { SettingsBootstrap } from '@nano/contracts';
import { Platform } from 'react-native';

type Hours = NonNullable<SettingsBootstrap['settings']['clinicHours']>;

/** Day-of-week, HH:MM and date in the clinic's own time zone. */
function clinicParts(now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, time: `${get('hour')}:${get('minute')}`, date: `${get('year')}-${get('month')}-${get('day')}` };
}

/** SUP-03 open/closed — `null` when the clinic hasn't published hours (then no claim either way). */
export function isOpenNow(hours: Hours | null, timeZone: string, now: number): boolean | null {
  if (!hours) return null;
  const { day, time, date } = clinicParts(now, timeZone);
  if (hours.closures.includes(date)) return false;
  return hours.weekly.some((h) => h.day === day && h.opens <= time && time < h.closes);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hhmm = (v: string) => {
  const [h = 0, m = 0] = v.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
};

/** "Mon 10 am–6 pm · Tue 10 am–6 pm" from the published weekly hours; `null` when none are published. */
export function hoursLabel(hours: Hours | null): string | null {
  if (!hours || hours.weekly.length === 0) return null;
  return [...hours.weekly]
    .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
    .map((h) => `${DAY_NAMES[h.day]} ${hhmm(h.opens)}–${hhmm(h.closes)}`)
    .join(' · ');
}

/** Opens the maps app on the clinic: the published directions link, else a search for the verified address. */
export function directionsUrl(clinic: SettingsBootstrap['clinic']): string {
  if (clinic.directionsUrl) return clinic.directionsUrl;
  const q = encodeURIComponent(clinic.address);
  return Platform.OS === 'ios' ? `https://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
}
