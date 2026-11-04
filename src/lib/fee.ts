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
  totalQty: number;
  subtotal: number;
};

export const isWholesaleFor = (config: CheckoutConfig, totalQty: number) =>
  totalQty >= config.wholesaleMinQty;

/**
 * Single source of truth for the previewed shipping fee. Mirrors the server's
 * `shippingFeeFor`: the selected governorate's fee, waived only by the owner's
 * wholesale quantity or free-shipping threshold — never by a city name.
 */
export function checkoutFeeFor(config: CheckoutConfig, ctx: FeeContext): number {
  if (isWholesaleFor(config, ctx.totalQty)) return 0;
  const threshold = config.freeThreshold;
  if (threshold !== null && threshold > 0 && ctx.subtotal >= threshold) return 0;
  return config.zones[ctx.governorate]?.fee ?? config.defaultFee;
}
