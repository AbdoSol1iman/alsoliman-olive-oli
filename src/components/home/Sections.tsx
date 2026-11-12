import Image from "next/image";
import Link from "next/link";
import { OliveBranch } from "@/components/brand/Logo";
import { ProductCard } from "@/components/store/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowEnd, Leaf, Ruler, Shield, Sparkle } from "@/components/ui/Icons";
import type { ListingItem } from "@/lib/products";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

const trustIcons = [Shield, Leaf, Sparkle, Ruler];

const DEFAULT_BOTTLE = "/products/bottle-cutout.png";

export function TrustStrip({ dict }: { dict: Dictionary }) {
  return (
    <section aria-label={dict.trust.map((t) => t.title).join(" · ")} className="border-b border-gold/15 bg-cream/35">
      <div className="container-page grid grid-cols-2 gap-y-8 py-10 md:grid-cols-4 md:gap-0 md:py-12">
        {dict.trust.map((item, i) => {
          const Icon = trustIcons[i] ?? Leaf;
          return (
            <div
              key={item.title}
              className={
                "flex flex-col items-start gap-3 px-0 md:px-8 " +
                (i > 0 ? "md:border-s md:border-gold/20" : "")
              }
            >
              <Icon size={22} className="text-gold" />
              <div>
                <p className="text-[0.92rem] font-medium text-forest">{item.title}</p>
                <p className="mt-1 text-[0.75rem] leading-6 text-ink-muted">{item.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FeaturedProducts({
  locale,
  dict,
  items,
  sampleCatalog,
}: {
  locale: Locale;
  dict: Dictionary;
  items: ListingItem[];
  sampleCatalog: boolean;
}) {
  return (
    <section className="paper py-20 md:py-28" aria-labelledby="featured-title">
      <div className="container-page">
        <SectionHeading
          eyebrow={dict.featured.eyebrow}
          title={<span id="featured-title">{dict.featured.title}</span>}
          body={dict.featured.body}
          action={
            <Link
              href={`/${locale}/shop`}
              className="group inline-flex items-center gap-2 text-[0.8rem] tracking-wide text-forest"
            >
              <span className="link-underline">{dict.featured.all}</span>
              <ArrowEnd size={15} className="text-gold transition-transform duration-500 group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" />
            </Link>
          }
        />

        {sampleCatalog ? (
          <p className="mt-6 inline-flex items-center gap-2 text-[0.68rem] text-gold/90">
            <span aria-hidden className="size-1 rounded-full bg-gold" />
            {dict.shop.sampleNotice}
          </p>
        ) : null}

        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 md:mt-14 md:grid-cols-3 md:gap-x-10">
          {items.map((item, i) => (
            <Reveal key={item.key} delay={i * 90} as="div">
              <ProductCard item={item} locale={locale} dict={dict} priority={i === 0} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorySection({
  locale,
  dict,
  image,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Optional owner-supplied image (media library path). */
  image?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-forest text-ivory" aria-labelledby="story-title">
      <OliveBranch
        className="pointer-events-none absolute -start-20 top-0 h-[520px] w-auto opacity-[0.14]"
        tone="#D2AF6A"
      />
      <div className="container-page relative grid gap-14 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
        <div>
          <p className="eyebrow text-gold-soft">{dict.story.eyebrow}</p>
          <h2 id="story-title" className="mt-5 max-w-lg text-[clamp(2rem,4.4vw,3.3rem)] text-ivory">
            {dict.story.title}
          </h2>

          <blockquote className="mt-8 border-s border-gold/40 ps-5">
            <p className="font-display text-[1.25rem] leading-[1.9] text-gold-pale md:text-[1.4rem]">
              {dict.story.quote}
            </p>
          </blockquote>

          <div className="mt-7 space-y-4 text-[0.92rem] leading-8 text-sage/85">
            {dict.story.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-6">
            <ButtonLink href={`/${locale}/story`} variant="light" size="md">
              {dict.story.cta}
            </ButtonLink>
            <span className="font-display text-[1.6rem] text-gold-soft/80">{dict.story.signature}</span>
          </div>
        </div>

        <Reveal className="relative">
          <div className="gilded relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden bg-ivory-deep">
            <div
              aria-hidden
              className="absolute inset-x-[15%] top-[8%] bottom-0 z-10 rounded-t-[999px] border border-gold/30"
            />
            <Image
              src={image || DEFAULT_BOTTLE}
              alt={
                locale === "ar"
                  ? "زجاجة زيت الزيتون من آل سليمان على خلفية كريمية"
                  : "Alsuliman olive oil bottle on a cream backdrop"
              }
              fill
              sizes="(max-width: 1024px) 80vw, 38vw"
              className={
                image
                  ? "object-cover"
                  : "object-contain object-bottom p-[14%] pb-[2%] drop-shadow-[0_20px_30px_rgba(38,49,31,0.25)]"
              }
              style={
                image
                  ? undefined
                  : {
                      maskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
                      WebkitMaskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
                    }
              }
            />
          </div>
          <div className="absolute -bottom-6 start-0 hidden bg-forest-deep px-6 py-4 md:block">
            <p className="text-[0.62rem] tracking-[0.24em] text-gold">
              {locale === "ar" ? "من الزيتون إلى المائدة" : "OLIVE TO TABLE"}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function WhySection({
  locale,
  dict,
  image,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Optional owner-supplied image (media library path). */
  image?: string;
}) {
  return (
    <section className="paper py-20 md:py-28" aria-labelledby="why-title">
      <div className="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto aspect-[5/6] w-full max-w-sm">
            <div className="absolute inset-0 translate-x-3 -translate-y-3 border border-gold/30" />
            <div className="relative size-full overflow-hidden bg-cream/60">
              <div
                aria-hidden
                className="absolute inset-x-[10%] top-[10%] bottom-[8%] rounded-full bg-ivory/50"
              />
              <Image
                src={image || DEFAULT_BOTTLE}
                alt={
                  locale === "ar"
                    ? "عبوة زيت الزيتون ١ لتر من آل سليمان"
                    : "Alsuliman 1 litre olive oil bottle"
                }
                fill
                sizes="(max-width: 1024px) 70vw, 30vw"
                className={
                  image
                    ? "object-cover"
                    : "object-contain object-bottom p-[16%] pb-[4%] drop-shadow-[0_18px_26px_rgba(38,49,31,0.22)]"
                }
                style={
                  image
                    ? undefined
                    : {
                        maskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
                      }
                }
              />
            </div>
            <div className="absolute -bottom-4 -start-4 bg-ivory px-4 py-3 shadow-soft">
              <p className="text-[0.65rem] tracking-[0.2em] text-gold">{dict.why.imageCaption}</p>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <p className="eyebrow">{dict.why.eyebrow}</p>
          <h2 id="why-title" className="mt-5 text-[clamp(1.8rem,3.9vw,2.9rem)]">
            {dict.why.title}
          </h2>
          <p className="mt-5 max-w-lg text-[0.92rem] leading-8 text-ink-muted">{dict.why.body}</p>

          <ol className="mt-10 divide-y divide-gold/15 border-y border-gold/15">
            {dict.why.items.map((item, i) => (
              <li key={item.title} className="group flex gap-5 py-5">
                <span className="tnum mt-1 font-display text-[1.1rem] text-gold/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[0.98rem] font-medium text-forest">{item.title}</p>
                  <p className="mt-1 text-[0.82rem] leading-7 text-ink-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* Small hand-drawn illustrations for the culinary band */
function CulinaryArt({ index }: { index: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 200 140" className="h-full w-full text-gold/80" aria-hidden="true">
      {index === 0 && (
        <g {...common}>
          {/* rustic loaf with scored crust */}
          <path d="M28 98c0-20 16-33 38-33h24c22 0 36 11 36 25 0 10-8 16-21 16H46c-10 0-18-3-18-8Z" />
          <path d="M52 76l-9 12M72 71l-11 15M92 68l-12 16" opacity=".55" />
          {/* dipping bowl with olives */}
          <path d="M124 102h44c0 12-10 20-22 20s-22-8-22-20Z" />
          <path d="M124 102c0-4 3-6 8-6h28c5 0 8 2 8 6" />
          <ellipse cx="140" cy="94" rx="7" ry="5.5" fill="currentColor" opacity=".25" />
          <ellipse cx="156" cy="95" rx="6" ry="5" fill="currentColor" opacity=".2" />
          {/* drizzle above */}
          <path d="M104 54c6-5 13-4 17 1-6 4-13 3-17-1Z" fill="currentColor" opacity=".22" />
        </g>
      )}
      {index === 1 && (
        <g {...common}>
          <path d="M40 84h120c0 24-18 38-40 38h-40c-22 0-40-14-40-38Z" />
          <path d="M40 84c0-6 4-8 8-8h104c4 0 8 2 8 8" />
          <path d="M70 70c-4-10 2-18 10-20M96 68c-6-12 0-22 10-24M120 72c-2-10 4-16 12-16" />
          <circle cx="86" cy="56" r="6" />
          <circle cx="112" cy="52" r="5" />
          <path d="M152 44c8-6 16-4 20 2-8 4-15 4-20-2Z" fill="currentColor" opacity=".2" />
        </g>
      )}
      {index === 2 && (
        <g {...common}>
          <circle cx="86" cy="76" r="30" />
          <path d="M86 46c10 8 10 52 0 60M56 76c14-8 46-8 60 0" opacity=".6" />
          <path d="M136 44c12 0 18 8 18 16s-8 14-18 14-18-6-18-14 6-16 18-16Z" />
          <path d="M136 74v34" />
          <path d="M120 108h32" />
          <path d="M136 20v10M126 26l6 8M146 26l-6 8" opacity=".7" />
        </g>
      )}
    </svg>
  );
}

export function CulinarySection({ dict }: { dict: Dictionary }) {
  const tones = ["bg-cream/70", "bg-sage/15", "bg-gold-pale/25"];
  return (
    <section className="bg-cream/60 py-20 md:py-28" aria-labelledby="culinary-title">
      <div className="container-page">
        <SectionHeading
          eyebrow={dict.culinary.eyebrow}
          title={<span id="culinary-title">{dict.culinary.title}</span>}
          body={dict.culinary.body}
          align="center"
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
          {dict.culinary.cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 100}>
              <article className="group flex h-full flex-col border border-gold/20 bg-ivory transition-colors duration-500 hover:border-gold/50">
                <div className={`relative aspect-[10/7] w-full overflow-hidden ${tones[i % tones.length]}`}>
                  <div className="absolute inset-0 p-8 transition-transform duration-700 group-hover:scale-[1.04]">
                    <CulinaryArt index={i} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col border-t border-gold/15 p-6">
                  <span className="text-[0.6rem] tracking-[0.26em] text-gold">
                    {String(i + 1).padStart(2, "0")} —
                  </span>
                  <h3 className="mt-2 text-[1.25rem]">{card.title}</h3>
                  <p className="mt-2 text-[0.82rem] leading-7 text-ink-muted">{card.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-[0.7rem] text-ink-muted/70">{dict.culinary.note}</p>
      </div>
    </section>
  );
}

export function ReviewsSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="paper py-20 md:py-24" aria-labelledby="reviews-title">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{dict.reviews.eyebrow}</p>
          <h2 id="reviews-title" className="mt-4 text-[clamp(1.7rem,3.6vw,2.6rem)]">
            {dict.reviews.title}
          </h2>

          <div className="mx-auto mt-10 border border-gold/25 bg-ivory px-8 py-12">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-gold/40 text-gold">
              <Sparkle size={20} />
            </div>
            <p className="mt-5 text-[0.88rem] leading-8 text-ink-muted">{dict.reviews.empty}</p>
            <ButtonLink href={`/${locale}/shop`} variant="outline" size="sm" className="mt-6">
              {dict.reviews.cta}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
