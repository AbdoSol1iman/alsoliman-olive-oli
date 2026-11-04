"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chevron, Check, Shield } from "@/components/ui/Icons";
import { submitOrder } from "@/app/actions/orders";
import { useCartLines } from "@/lib/catalog-client";
import { useCartStore } from "@/lib/cart-store";
import { useHydrated } from "@/lib/use-hydrated";
import { checkoutSchema, fieldErrors } from "@/lib/checkout-schema";
import {
  checkoutFeeFor,
  isFreeCityFor,
  isWholesaleFor,
  type CheckoutConfig,
} from "@/lib/fee";
import { cx, formatPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

type Errors = Record<string, string>;

export function CheckoutForm({
  locale,
  dict,
  config,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Shipping/payment settings resolved server-side from the database. */
  config: CheckoutConfig;
}) {
  /** Shipping zones as a stable list (derived per render from config). */
  const zones = Object.entries(config.zones);
  const lines = useCartLines();
  const clear = useCartStore((s) => s.clear);
  const router = useRouter();
  const keyRef = useRef<string>("");
  const mounted = useHydrated();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    governorate: "",
    city: "",
    address: "",
    notes: "",
    payment: "cod" as "cod" | "instapay",
  });

  /** Stable idempotency key per checkout attempt — created lazily on first
   *  submit so retries of the same order can never create a duplicate. */
  const idempotencyKey = () => {
    if (!keyRef.current) {
      keyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return keyRef.current;
  };

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const zoneFee = form.governorate
    ? checkoutFeeFor(config, {
        governorate: form.governorate,
        city: form.city,
        totalQty,
        subtotal,
      })
    : null;
  const shippingFee = zoneFee ?? 0;
  const freeReason =
    zoneFee === 0
      ? isFreeCityFor(config, form.city)
        ? ("city" as const)
        : isWholesaleFor(config, totalQty)
          ? ("wholesale" as const)
          : null
      : null;
  const total = subtotal + shippingFee;

  const set = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
    setFormError("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    const parsed = checkoutSchema.safeParse({
      ...form,
      notes: form.notes,
      locale,
      idempotencyKey: idempotencyKey(),
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
    });

    if (!parsed.success) {
      const map = fieldErrors(parsed.error.issues);
      const localized: Errors = {};
      for (const [field, msg] of Object.entries(map)) {
        localized[field] =
          field === "fullName" ? dict.checkout.validation.name
          : field === "phone" ? dict.checkout.validation.phone
          : field === "governorate" ? dict.checkout.validation.governorate
          : field === "city" ? dict.checkout.validation.city
          : field === "address" ? dict.checkout.validation.address
          : msg;
      }
      setErrors(localized);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitOrder(parsed.data);
      if (!result.ok) {
        // The key is kept so a retry of the same attempt can never double-charge.
        // Surface the real reason instead of one generic message: the customer
        // can act on "item gone" / "governorate changed", but not on a blank slate.
        setFormError(
          result.code === "unavailable"
            ? dict.checkout.errorUnavailable
            : result.code === "invalid_zone"
              ? dict.checkout.errorZone
              : dict.checkout.errorGeneric,
        );
        setSubmitting(false);
        return;
      }
      // The order is stored: retire the key so the next order (e.g. after the
      // customer returns to the shop) gets its own reference.
      keyRef.current = "";
      clear();
      router.push(`/${locale}/order/${result.reference}`);
    } catch {
      // The action never produced a result: offline, or the page predates the
      // last deploy (server-action ids change per build → HTTP 400).
      setFormError(dict.checkout.errorStale);
      setSubmitting(false);
    }
  };

  if (mounted && lines.length === 0) {
    return (
      <div className="container-page py-20 text-center md:py-28">
        <h1 className="text-[clamp(1.7rem,4vw,2.4rem)]">{dict.checkout.emptyCart}</h1>
        <ButtonLink href={`/${locale}/shop`} size="lg" className="mt-7">
          {dict.cart.shopNow}
        </ButtonLink>
      </div>
    );
  }

  const fieldClass = (name: string) =>
    cx(
      "h-12 w-full border bg-ivory px-4 text-[0.88rem] outline-none transition-colors placeholder:text-ink-muted/50",
      errors[name] ? "border-red-700/60 focus:border-red-700" : "border-forest/20 focus:border-gold",
    );

  return (
    <div className="container-page py-10 md:py-16">
      <div className="mb-10">
        <p className="eyebrow">{dict.checkout.title}</p>
        <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)]">{dict.checkout.title}</h1>
        <p className="mt-2 text-[0.88rem] text-ink-muted">{dict.checkout.subtitle}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="space-y-8">
          <fieldset className="border border-gold/20 bg-ivory p-6 md:p-8">
            <legend className="px-2 text-[0.75rem] tracking-[0.18em] text-gold">
              {dict.checkout.contact}
            </legend>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="fullName" className="mb-1.5 block text-[0.78rem] text-forest">
                  {dict.checkout.fullName} <span className="text-gold">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder={dict.checkout.fullNamePlaceholder}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  className={fieldClass("fullName")}
                />
                {errors.fullName ? (
                  <p id="fullName-error" className="mt-1.5 text-[0.72rem] text-red-800">{errors.fullName}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="phone" className="mb-1.5 block text-[0.78rem] text-forest">
                  {dict.checkout.phone} <span className="text-gold">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder={dict.checkout.phonePlaceholder}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby="phone-hint"
                  className={fieldClass("phone")}
                />
                <p id="phone-hint" className="mt-1.5 text-[0.68rem] text-ink-muted">{dict.checkout.phoneHint}</p>
                {errors.phone ? <p className="mt-1 text-[0.72rem] text-red-800">{errors.phone}</p> : null}
              </div>

              <div>
                <label htmlFor="governorate" className="mb-1.5 block text-[0.78rem] text-forest">
                  {dict.checkout.governorate} <span className="text-gold">*</span>
                </label>
                <div className="relative">
                  <select
                    id="governorate"
                    name="governorate"
                    value={form.governorate}
                    onChange={(e) => set("governorate", e.target.value)}
                    aria-invalid={Boolean(errors.governorate)}
                    className={cx(fieldClass("governorate"), "appearance-none pe-10")}
                  >
                    <option value="">{dict.checkout.governoratePlaceholder}</option>
                    {zones.map(([key, zone]) => (
                      <option key={key} value={key}>
                        {locale === "ar" ? zone.ar : zone.en} — {formatPrice(zone.fee, locale)}
                      </option>
                    ))}
                  </select>
                  <Chevron size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                </div>
                {errors.governorate ? <p className="mt-1 text-[0.72rem] text-red-800">{errors.governorate}</p> : null}
              </div>

              <div>
                <label htmlFor="city" className="mb-1.5 block text-[0.78rem] text-forest">
                  {dict.checkout.city} <span className="text-gold">*</span>
                </label>
                <input
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder={dict.checkout.cityPlaceholder}
                  aria-invalid={Boolean(errors.city)}
                  className={fieldClass("city")}
                />
                {errors.city ? <p className="mt-1 text-[0.72rem] text-red-800">{errors.city}</p> : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className="mb-1.5 block text-[0.78rem] text-forest">
                  {dict.checkout.address} <span className="text-gold">*</span>
                </label>
                <textarea
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  rows={3}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder={dict.checkout.addressPlaceholder}
                  aria-invalid={Boolean(errors.address)}
                  className={cx(
                    fieldClass("address"),
                    "h-auto min-h-24 resize-y py-3 leading-7",
                  )}
                />
                {errors.address ? <p className="mt-1 text-[0.72rem] text-red-800">{errors.address}</p> : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="mb-1.5 block text-[0.78rem] text-forest">
                  {dict.checkout.notes} <span className="text-ink-muted">({dict.common.optional})</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder={dict.checkout.notesPlaceholder}
                  className={cx(fieldClass("notes"), "h-auto min-h-20 resize-y py-3 leading-7")}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="border border-gold/20 bg-ivory p-6 md:p-8">
            <legend className="px-2 text-[0.75rem] tracking-[0.18em] text-gold">
              {dict.checkout.payment}
            </legend>

            <div className="mt-5 space-y-3">
              <label
                className={cx(
                  "flex cursor-pointer items-start gap-3 border p-4 transition-colors",
                  form.payment === "cod" ? "border-forest bg-cream/40" : "border-forest/15 hover:border-forest/40",
                )}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={form.payment === "cod"}
                  onChange={() => set("payment", "cod")}
                  className="mt-1 accent-[#26311f]"
                />
                <span>
                  <span className="block text-[0.88rem] text-forest">{dict.footer.cod}</span>
                  <span className="mt-0.5 block text-[0.75rem] text-ink-muted">{dict.checkout.codDesc}</span>
                </span>
              </label>

              {config.instapayEnabled ? (
                <label
                  className={cx(
                    "flex cursor-pointer items-start gap-3 border p-4 transition-colors",
                    form.payment === "instapay" ? "border-forest bg-cream/40" : "border-forest/15 hover:border-forest/40",
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="instapay"
                    checked={form.payment === "instapay"}
                    onChange={() => set("payment", "instapay")}
                    className="mt-1 accent-[#26311f]"
                  />
                  <span>
                    <span className="block text-[0.88rem] text-forest">
                      {locale === "ar" ? config.instapayLabelAr : config.instapayLabelEn}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-ink-muted">{config.instapayInstructionsAr}</span>
                  </span>
                </label>
              ) : null}
            </div>

            <p className="mt-4 flex items-start gap-2 text-[0.7rem] leading-6 text-ink-muted">
              <Shield size={15} className="mt-0.5 shrink-0 text-gold" />
              {dict.checkout.secureNote}
            </p>
          </fieldset>
        </div>

        <aside className="h-fit border border-gold/25 bg-cream/30 p-6 lg:sticky lg:top-28">
          <h2 className="text-[1.2rem]">{dict.checkout.summary}</h2>

          <ul className="mt-5 space-y-4">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden bg-ivory">
                  <Image
                    src={line.product.images[0].src}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-contain object-bottom p-1"
                  />
                  <span className="tnum absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-forest text-[0.6rem] text-ivory">
                    {line.qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8rem] text-charcoal">
                    {locale === "ar" ? line.product.nameAr : line.product.nameEn}
                  </p>
                  <p className="text-[0.7rem] text-ink-muted">
                    {locale === "ar" ? line.variant.sizeLabelAr : line.variant.sizeLabelEn}
                  </p>
                </div>
                <span className="tnum text-[0.78rem] text-forest">
                  {formatPrice(line.lineTotal, locale)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-3 border-t border-gold/25 pt-5 text-[0.84rem]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">{dict.cart.subtotal}</dt>
              <dd className="tnum text-forest">{formatPrice(subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">{dict.checkout.shippingFee}</dt>
              <dd className="tnum text-forest">
                {zoneFee === null ? (
                  <span className="text-[0.72rem] text-ink-muted">{dict.cart.shippingNote}</span>
                ) : zoneFee === 0 ? (
                  <span className="text-forest">{dict.cart.free}</span>
                ) : (
                  formatPrice(shippingFee, locale)
                )}
              </dd>
            </div>
            {freeReason === "city" ? (
              <p className="text-[0.7rem] leading-6 text-forest">{dict.checkout.freeCityNote}</p>
            ) : freeReason === "wholesale" ? (
              <p className="text-[0.7rem] leading-6 text-forest">
                {dict.checkout.freeWholesaleNote.replace("{n}", String(config.wholesaleMinQty))}
              </p>
            ) : null}
          </dl>

          <div className="mt-5 flex items-center justify-between border-t border-gold/25 pt-5">
            <span className="text-[0.85rem] text-ink-muted">{dict.cart.total}</span>
            <span className="tnum text-[1.25rem] font-medium text-forest">
              {formatPrice(total, locale)}
            </span>
          </div>

          {formError ? (
            <p role="alert" className="mt-4 border border-red-800/30 bg-red-50/50 p-3 text-[0.75rem] text-red-900">
              {formError}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
            {submitting ? dict.checkout.placing : dict.checkout.placeOrder}
            {!submitting ? <Check size={16} /> : null}
          </Button>

          <p className="mt-3 text-center text-[0.68rem] leading-5 text-ink-muted">
            {dict.checkout.agree}{" "}
            <Link href={`/${locale}/terms`} className="text-forest underline decoration-gold/50 underline-offset-2">
              {dict.footer.links.terms}
            </Link>
          </p>
          <p className="mt-1 text-center text-[0.68rem] text-ink-muted">
            {locale === "ar" ? config.notesAr : config.notesEn}
          </p>
        </aside>
      </form>
    </div>
  );
}
