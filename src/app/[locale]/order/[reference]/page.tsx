import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/Button";
import { Check, Whatsapp } from "@/components/ui/Icons";
import { getSettings } from "@/lib/settings";
import { getSiteDictionary } from "@/lib/content";
import { formatDate, formatPrice } from "@/lib/format";
import { buildOrderWhatsappHref, getOrderByReference } from "@/lib/orders";
import type { Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export const instant = false;

export const metadata: Metadata = {
  title: "تفاصيل الطلب",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<{ wa?: string }>;
}) {
  await connection();
  const [{ locale: raw, reference }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const [dict, settings] = await Promise.all([getSiteDictionary(locale), getSettings()]);
  const result = await getOrderByReference(reference);

  if (!result) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-[clamp(1.7rem,4vw,2.4rem)]">{dict.order.notFound}</h1>
        <p className="mt-3 text-[0.9rem] text-ink-muted">{dict.order.notFoundBody}</p>
        <ButtonLink href={`/${locale}`} size="lg" className="mt-8">
          {dict.order.backHome}
        </ButtonLink>
      </div>
    );
  }

  const { order, items } = result;
  const isAr = locale === "ar";
  const zone = order.governorate;
  const govLabel = isAr ? settings.shipping.zones[zone]?.ar : settings.shipping.zones[zone]?.en;

  // Rebuilt from the stored order on every render: the link is complete
  // (name, phone, address, items, totals, reference) and survives a reload.
  const waHref = buildOrderWhatsappHref(order, items, settings, locale);
  const waState =
    !waHref ? "unavailable" : query.wa === "blocked" ? "blocked" : "ready";

  return (
    <div className="paper min-h-[70vh]">
      <div className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-gold/40 bg-ivory text-gold">
              <Check size={26} />
            </span>
            <h1 className="mt-6 text-[clamp(1.8rem,4vw,2.6rem)]">{dict.order.success}</h1>
            <p className="mt-3 text-[0.9rem] leading-8 text-ink-muted">{dict.order.successBody}</p>
            <p className="mt-6 inline-flex items-center gap-2 border border-gold/30 bg-ivory px-4 py-2">
              <span className="text-[0.68rem] tracking-[0.16em] text-ink-muted">{dict.order.reference}:</span>
              <span className="tnum text-[0.9rem] font-medium text-forest" dir="ltr">#{order.reference}</span>
            </p>
            <p className="mt-2 text-[0.7rem] text-ink-muted">{formatDate(order.created_at, locale)}</p>
          </div>

          {/* WhatsApp hand-off: the only step that actually confirms the order. */}
          <div
            data-testid="order-whatsapp-panel"
            className="mt-8 border border-gold/30 bg-cream/30 p-6 text-center md:p-8"
          >
            <p className="text-[0.62rem] tracking-[0.18em] text-gold">{dict.order.next}</p>
            <h2 className="mt-2 text-[1.15rem] text-forest">{dict.order.notConfirmedYet}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[0.85rem] leading-8 text-charcoal">
              {dict.order.instruction}
            </p>

            {waState === "blocked" ? (
              <p className="mx-auto mt-4 max-w-xl border border-gold/30 bg-ivory px-4 py-3 text-[0.8rem] leading-7 text-forest">
                {dict.order.whatsappBlocked}
              </p>
            ) : null}

            {waHref ? (
              <>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-testid="order-whatsapp"
                  className="mt-5 inline-flex h-[3.4rem] w-full items-center justify-center gap-2.5 rounded-xs bg-forest px-8 text-[0.95rem] font-medium tracking-wide text-ivory transition-colors hover:bg-forest-deep sm:w-auto"
                >
                  <Whatsapp size={19} />
                  {dict.order.whatsappConfirm}
                </a>
                <p className="mt-4 text-[0.7rem] leading-6 text-ink-muted">{dict.order.whatsappNote}</p>
              </>
            ) : (
              <>
                <p className="mx-auto mt-4 max-w-xl border border-gold/30 bg-ivory px-4 py-3 text-[0.8rem] leading-7 text-forest">
                  {dict.order.whatsappUnavailable}
                </p>
                <ButtonLink href={`/${locale}/contact`} variant="outline" size="md" className="mt-4">
                  {dict.footer.links.contact}
                </ButtonLink>
              </>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: dict.order.status, value: dict.order.statuses[order.status] },
              {
                label: dict.order.payment,
                value: order.payment_method === "cod" ? (isAr ? "الدفع عند الاستلام" : "Cash on delivery") : "InstaPay",
              },
              { label: dict.checkout.shippingFee, value: formatPrice(order.shipping, locale) },
            ].map((b) => (
              <div key={b.label} className="border border-gold/20 bg-ivory p-4 text-center">
                <p className="text-[0.62rem] tracking-[0.18em] text-gold">{b.label}</p>
                <p className="mt-1.5 text-[0.85rem] text-forest">{b.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border border-gold/20 bg-ivory">
            <div className="border-b border-gold/15 px-6 py-4">
              <h2 className="text-[1.05rem]">{dict.order.items}</h2>
            </div>
            <ul className="divide-y divide-gold/12 px-6">
              {items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="text-[0.85rem] text-charcoal">{isAr ? item.name_ar : item.name_en}</p>
                    <p className="text-[0.72rem] text-ink-muted">
                      {isAr ? item.size_ar : item.size_en} × {item.qty}
                    </p>
                  </div>
                  <span className="tnum text-[0.85rem] text-forest">
                    {formatPrice(item.unit_price * item.qty, locale)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-gold/15 px-6 py-4 text-[0.82rem]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">{dict.cart.subtotal}</dt>
                <dd className="tnum text-forest">{formatPrice(order.subtotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">{dict.checkout.shippingFee}</dt>
                <dd className="tnum text-forest">{formatPrice(order.shipping, locale)}</dd>
              </div>
              <div className="flex justify-between border-t border-gold/15 pt-2 text-[0.95rem]">
                <dt className="text-forest">{dict.cart.total}</dt>
                <dd className="tnum font-medium text-forest">{formatPrice(order.total, locale)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-gold/20 bg-ivory p-5">
              <p className="text-[0.62rem] tracking-[0.18em] text-gold">{dict.order.shippingTo}</p>
              <p className="mt-2 text-[0.85rem] text-charcoal">{order.customer_name}</p>
              <p className="text-[0.78rem] leading-6 text-ink-muted">
                {order.address}، {order.city}، {govLabel}
              </p>
              <p className="tnum mt-1 text-[0.78rem] text-ink-muted" dir="ltr">{order.phone}</p>
            </div>
            <div className="border border-gold/20 bg-ivory p-5">
              <p className="text-[0.62rem] tracking-[0.18em] text-gold">{dict.order.next}</p>
              <ol className="mt-2 space-y-1.5 text-[0.78rem] leading-6 text-ink-muted">
                {dict.order.nextSteps.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="text-gold">·</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href={`/${locale}/shop`} variant="outline" size="md">
              {dict.cart.continue}
            </ButtonLink>
          </div>

          <p className="mt-8 text-center text-[0.7rem] text-ink-muted">
            {dict.order.savedNote} ·{" "}
            <Link href={`/${locale}/contact`} className="underline decoration-gold/50 underline-offset-2">
              {dict.footer.links.contact}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
