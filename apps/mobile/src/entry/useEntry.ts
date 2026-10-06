import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getNotificationPermission, type PermissionState } from '../platform/notifications';
import { useSettings } from '../settings/useSettings';
import { decideEntry, type EntryScreen } from './decide';

const PRIMER_KEY = 'nano.entry.primerSeen.v1';
/** Longest the in-app splash waits for the remote gate before falling through to Home. */
export const GATE_WAIT_MS = 4000;

/** Installed native version; unknown inside Expo Go, where the update gate can't apply. */
function installedVersion(): string | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  return Application.nativeApplicationVersion;
}

export async function markPrimerSeen() {
  await AsyncStorage.setItem(PRIMER_KEY, '1').catch(() => undefined);
}

/** Resolves which ENT screen to show, once settings settle; null while deciding (in-app splash stays up). */
export function useEntry(): EntryScreen | null {
  const settings = useSettings();
  const [local, setLocal] = useState<{ primerSeen: boolean; permission: PermissionState } | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  // Launch time, captured once so the decision is a pure function of its inputs.
  const [launchedAt] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(PRIMER_KEY).catch(() => null), getNotificationPermission()]).then(([seen, permission]) => {
      if (active) setLocal({ primerSeen: seen === '1', permission });
    });
    const timer = setTimeout(() => setTimedOut(true), GATE_WAIT_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const settled = !settings.isPending || timedOut;
  if (!local || !settled) return null;
  return decideEntry({
    gate: settings.data?.data.app ?? null,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: installedVersion(),
    primerSeen: local.primerSeen,
    notificationPermission: local.permission,
    now: launchedAt,
  });
}

/**
 * Root-level blocking gates (ENT-02 update required, ENT-03 maintenance) for every route, re-evaluated as
 * settings refresh and when the maintenance window ends. Returns null when nothing blocks.
 */
export function useHardGate(): 'update' | 'maintenance' | null {
  const gate = useSettings().data?.data.app ?? null;
  const [now, setNow] = useState(() => Date.now());
  const until = gate?.maintenance ? Date.parse(gate.maintenance.until) : null;
  useEffect(() => {
    if (until === null || until <= now) return;
    // Wake when the window closes (setTimeout caps at ~24.8 days; longer windows re-check on refetch).
    const timer = setTimeout(() => setNow(Date.now()), Math.min(until - now, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [until, now]);
  const screen = decideEntry({
    gate,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: installedVersion(),
    primerSeen: true,
    notificationPermission: 'granted',
    now,
  });
  return screen === 'update' || screen === 'maintenance' ? screen : null;
}
