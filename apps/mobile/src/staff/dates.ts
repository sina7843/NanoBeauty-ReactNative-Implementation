/** Staff date inputs are clinic-local wall time ("2026-10-31 23:59"), whatever zone the phone is in. */
function wallParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute') };
}

export function toWallInput(iso: string | null, timeZone: string): string {
  if (!iso) return '';
  const p = wallParts(Date.parse(iso), timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`;
}

/** Clinic wall time → ISO instant, or null when the text isn't a real date. DST-safe (offset re-checked once). */
export function fromWallInput(text: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const target = Date.UTC(y, mo - 1, d, h, mi);
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = wallParts(guess, timeZone);
    guess += target - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  }
  const back = wallParts(guess, timeZone);
  if (back.d !== d || back.mo !== mo) return null;
  return new Date(guess).toISOString();
}
