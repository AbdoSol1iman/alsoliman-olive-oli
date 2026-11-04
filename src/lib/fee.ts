/**
 * Client-safe shipping/fee helpers.
 *
 * The server derives `CheckoutConfig` from the database settings (see
 * `settings.ts` → `toCheckoutConfig`) and passes it to the checkout form, so
 * the customer-facing preview always matches what the order action charges —
 * without shipping the whole settings object to the browser.
 */

export type CheckoutZone = { ar: string; en: string; fee: number; days: string };

export type CheckoutConfig = {
  zones: Record<string, CheckoutZone>;
  defaultFee: number;
  freeCityNames: string[];
  wholesaleMinQty: number;
  freeThreshold: number | null;
  codFee: number;
  instapayEnabled: boolean;
  instapayHandle: string;
  instapayLabelAr: string;
  instapayLabelEn: string;
  instapayInstructionsAr: string;
  notesAr: string;
  notesEn: string;
};

export type FeeContext = {
  governorate: string;
  city: string;
  totalQty: number;
  subtotal: number;
};

export function isFreeCityFor(config: CheckoutConfig, city: string): boolean {
  const v = city.trim().toLowerCase();
  if (!v) return false;
  return config.freeCityNames.some((name) => v.includes(name));
}

export const isWholesaleFor = (config: CheckoutConfig, totalQty: number) =>
  totalQty >= config.wholesaleMinQty;

/** Single source of truth for the previewed shipping fee. */
export function checkoutFeeFor(config: CheckoutConfig, ctx: FeeContext): number {
  if (isFreeCityFor(config, ctx.city)) return 0;
  if (isWholesaleFor(config, ctx.totalQty)) return 0;
  const threshold = config.freeThreshold;
  if (threshold !== null && threshold > 0 && ctx.subtotal >= threshold) return 0;
  return config.zones[ctx.governorate]?.fee ?? config.defaultFee;
}
