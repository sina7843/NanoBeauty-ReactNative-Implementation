import type { AppGate } from '@nano/contracts';

export type EntryScreen = 'update' | 'maintenance' | 'primer' | 'home';

/** -1 / 0 / 1 for MAJOR.MINOR.PATCH strings; non-numeric parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export interface EntryInput {
  /** Remote gate from settings; `null` when settings couldn't be loaded (then no remote gate applies). */
  gate: AppGate | null;
  platform: 'ios' | 'android';
  /** Installed native version; `null` when unknown (Expo Go, tests) — the update gate is skipped. */
  appVersion: string | null;
  primerSeen: boolean;
  notificationPermission: 'granted' | 'denied' | 'undetermined';
  now: number;
}

/**
 * ENT-01…04 order: update required (ENT-02) beats maintenance (ENT-03); the notification primer (ENT-04)
 * shows once, only while the OS permission is still undetermined; otherwise Home.
 */
export function decideEntry({ gate, platform, appVersion, primerSeen, notificationPermission, now }: EntryInput): EntryScreen {
  if (gate && appVersion && compareVersions(appVersion, gate.minimumVersion[platform]) < 0) return 'update';
  if (gate?.maintenance && Date.parse(gate.maintenance.until) > now) return 'maintenance';
  if (!primerSeen && notificationPermission === 'undetermined') return 'primer';
  return 'home';
}
