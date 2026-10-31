import type { Locale } from "./products";

export const formatPrice = (value: number, locale: Locale = "ar") => {
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
  return locale === "ar" ? `${n} ج.م` : `EGP ${n}`;
};

export const formatNumber = (value: number, locale: Locale = "ar") =>
  new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);

export const formatDate = (iso: string, locale: Locale = "ar") =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));

export const cx = (...parts: unknown[]) =>
  parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");

/** Scroll-lock helper used by the drawer + mobile menu. */
export const lockScroll = (locked: boolean) => {
  if (typeof document === "undefined") return;
  document.documentElement.style.overflow = locked ? "hidden" : "";
};
