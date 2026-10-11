import type { Db } from './db';

/** Clearly fake Fresha link for local runs (D-QA-06). `.invalid` can never resolve. */
export const SAMPLE_FRESHA_URL = 'https://fresha.invalid/sample/nano-beauty';

/**
 * D-QA-06: made-up clinic phone (555) and weekly opening hours so flows that need them can be tried in development.
 * Only fills values the clinic hasn't set (never overwrites), keeps `settings.sample = true` (Sample badges), and is
 * switched on only by DEV_SAMPLE_CLINIC, which the config refuses outside APP_ENV=development.
 */
export async function applyDevSampleClinic(db: Db): Promise<boolean> {
  const [row] = await db.query<{ clinic: Record<string, unknown>; settings: Record<string, unknown> }>('SELECT clinic, settings FROM app_settings WHERE id = 1');
  if (!row || (row.clinic.phone && row.settings.clinicHours)) return false;
  const clinic = { ...row.clinic, phone: row.clinic.phone ?? '(604) 555-0100' };
  const weekly = [2, 3, 4, 5, 6].map((day) => ({ day, opens: '10:00', closes: day === 4 ? '19:00' : '17:00' }));
  const settings = { ...row.settings, clinicHours: row.settings.clinicHours ?? { weekly, closures: [] }, sample: true };
  await db.query('UPDATE app_settings SET clinic = $1, settings = $2, version = version + 1, updated_at = now() WHERE id = 1', [JSON.stringify(clinic), JSON.stringify(settings)]);
  return true;
}
