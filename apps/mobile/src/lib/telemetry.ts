import { redactText } from '@nano/contracts';

// Crash/error telemetry boundary (NFR 08; vendor not chosen — E5). Reports are redacted before they reach the sink:
// no contact details, codes, tokens or request bodies; route patterns instead of filled-in paths.
export type ErrorReport = { message: string; name: string; where: string; fatal: boolean };

export interface TelemetrySink {
  capture(report: ErrorReport): void;
}

const devSink: TelemetrySink = {
  capture(report) {
    if (__DEV__) console.warn('[telemetry]', report);
  },
};
let sink: TelemetrySink = devSink;

/** `/wallet/gift-cards/3f2c…` → `/wallet/gift-cards/:id`; query strings dropped (they can carry codes). */
export function routePattern(path: string): string {
  return (
    path
      .split('?')[0]!
      .split('/')
      .map((seg) => (/\d/.test(seg) || seg.length > 24 ? ':id' : seg))
      .join('/') || '/'
  );
}

export const telemetry = {
  setSink(next: TelemetrySink) {
    sink = next;
  },
  capture(error: unknown, where: string, fatal = false) {
    const e = error instanceof Error ? error : new Error(String(error));
    sink.capture({ message: redactText(e.message).slice(0, 500), name: e.name, where: routePattern(where), fatal });
  },
};

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
declare const ErrorUtils: { getGlobalHandler(): GlobalHandler; setGlobalHandler(h: GlobalHandler): void } | undefined;

/** Uncaught JS errors are reported (redacted), then the default handler runs as before. */
export function installGlobalErrorHandler() {
  if (typeof ErrorUtils === 'undefined') return;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      telemetry.capture(error, 'global', !!isFatal);
    } catch {
      // never let reporting hide the original crash
    }
    previous(error, isFatal);
  });
}
