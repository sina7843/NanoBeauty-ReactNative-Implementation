import type { Catalog, Price, Service } from '@nano/contracts';
import { t } from '../i18n';
import { money } from '../i18n/format';
import type { BasketItem } from './basket';

/** The clinic's visit limit (BOOK 17); Fresha has the final say on what fits. */
export const MAX_VISIT_MINUTES = 180;

export function priceLabel(price: Price, consultationCAD: number | null): string {
  switch (price.kind) {
    case 'from':
      return `${t('price.from')} ${money(price.amount ?? 0)}`;
    case 'range':
      return `${money(price.min ?? 0)}–${money(price.max ?? 0)}`;
    case 'perUnit':
      return `${t('price.from')} ${money(price.amount ?? 0)} / ${price.unit ?? ''}`.trim();
    case 'consultation':
      return consultationCAD === null ? t('price.consultation') : t('trt.consultation', { price: money(consultationCAD) });
    default:
      return money(price.amount ?? 0);
  }
}

export interface BasketLine {
  key: string;
  service: Service;
  name: string;
  detail: string | null;
  minutes: number;
  priceLabel: string;
  /** Lowest known amount, for the "From" total. */
  amount: number;
  exact: boolean;
  needsAreas: boolean;
}

/**
 * Lines and totals for the basket. Prices are what the catalogue says; a total with any "from" price is shown
 * as "From …" because the final price is the clinic's (and Fresha's) to confirm.
 */
export function summarize(items: BasketItem[], catalog: Catalog, consultationCAD: number | null) {
  const lines: BasketLine[] = [];
  for (const item of items) {
    const service = catalog.services.find((s) => s.id === item.serviceId && s.status === 'live');
    if (!service) continue;
    const consult = service.price.kind === 'consultation';
    if (service.perArea && service.areas) {
      const offered = service.areas[item.areas?.set ?? 'women'];
      const picked = offered.filter((a) => item.areas?.names.includes(a.name));
      const amount = picked.reduce((sum, a) => sum + a.price, 0);
      lines.push({
        key: service.id,
        service,
        name: service.name,
        detail: picked.length ? picked.map((a) => a.name).join(', ') : t('bkg.chooseAreasNext'),
        minutes: service.durationMin ?? 0,
        priceLabel: picked.length ? money(amount) : priceLabel(service.price, consultationCAD),
        amount,
        exact: picked.length > 0 && picked.every((a) => a.kind === 'fixed'),
        needsAreas: picked.length === 0,
      });
      continue;
    }
    lines.push({
      key: service.id,
      service,
      name: service.name,
      detail: null,
      minutes: service.durationMin ?? 0,
      priceLabel: priceLabel(service.price, consultationCAD),
      amount: consult ? (consultationCAD ?? 0) : (service.price.amount ?? service.price.min ?? 0),
      exact: service.price.kind === 'fixed' || (consult && consultationCAD !== null),
      needsAreas: false,
    });
  }
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const totalMinutes = lines.reduce((sum, l) => sum + l.minutes, 0);
  return {
    lines,
    totalMinutes,
    totalLabel: lines.every((l) => l.exact) ? money(total) : `${t('price.from')} ${money(total)}`,
    tooLong: totalMinutes > MAX_VISIT_MINUTES,
    needsAreas: lines.find((l) => l.needsAreas)?.service ?? null,
  };
}
