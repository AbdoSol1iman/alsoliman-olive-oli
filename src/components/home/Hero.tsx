import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Seal, OliveBranch } from "@/components/brand/Logo";
import { ArrowEnd, Drop, Leaf, Truck } from "@/components/ui/Icons";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

const DEFAULT_HERO_IMAGE = "/products/bottle-cutout.png";

export function Hero({
  locale,
  dict,
  image,
}: {
  locale: Locale;
  dict: Dictionary;
  /** Optional owner-supplied hero image (media library path). */
  image?: string;
}) {
  const heroImage = image || DEFAULT_HERO_IMAGE;
  return (
    <section className="paper relative overflow-hidden">
      {/* ambient botanicals */}
      <OliveBranch
        className="pointer-events-none absolute -start-16 top-24 h-[430px] w-auto text-gold opacity-[0.16] md:opacity-20"
        tone="#8C7A46"
      />
      <OliveBranch
        flip
        className="pointer-events-none absolute -end-24 -bottom-10 h-[380px] w-auto opacity-[0.13] md:opacity-[0.18]"
        tone="#6E7C4C"
      />

      <div className="container-page relative grid gap-6 pb-10 pt-8 md:pt-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-2 lg:pb-0">
        <div className="relative z-10 max-w-xl py-4 md:py-10 lg:py-20">
          <div
            className="mb-6 flex items-center gap-3"
            style={{ animation: "slm-fade-up .8s var(--ease-out-soft) both" }}
          >
            <span className="h-px w-10 bg-gold/70" />
            <p className="eyebrow">{dict.hero.eyebrow}</p>
          </div>

          <h1
            className="font-display text-[clamp(2.7rem,7.6vw,4.9rem)] leading-[1.16] tracking-[-0.01em] text-forest"
            style={{ animation: "slm-fade-up .9s .06s var(--ease-out-soft) both" }}
          >
            <span className="block">{dict.hero.titleTop}</span>
            <span className="relative mt-1 block text-olive">
              {dict.hero.titleBottom}
              <span aria-hidden className="absolute -bottom-2 start-0 h-px w-3/5 bg-gradient-to-l from-gold/0 via-gold/70 to-gold/0" />
            </span>
          </h1>

          <p
            className="mt-7 max-w-md text-[0.98rem] leading-[2] text-ink-muted md:text-[1.05rem]"
            style={{ animation: "slm-fade-up .9s .16s var(--ease-out-soft) both" }}
          >
            {dict.hero.body}
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
            style={{ animation: "slm-fade-up .9s .24s var(--ease-out-soft) both" }}
          >
            <ButtonLink href={`/${locale}/shop`} size="lg">
              {dict.hero.ctaPrimary}
              <ArrowEnd
                size={17}
                className="transition-transform duration-500 group-hover/btn:-translate-x-1 rtl:rotate-180 rtl:group-hover/btn:translate-x-1"
              />
            </ButtonLink>
            <ButtonLink href={`/${locale}/story`} variant="ghost" size="lg" className="px-0">
              <span className="link-underline">{dict.hero.ctaSecondary}</span>
              <ArrowEnd size={16} className="text-gold rtl:rotate-180" />
            </ButtonLink>
          </div>

          <ul className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.72rem] text-ink-muted">
            {[
              { Icon: Truck, label: dict.hero.marks[0] },
              { Icon: Drop, label: dict.hero.marks[1] },
              { Icon: Leaf, label: dict.hero.marks[2] },
            ].map(({ Icon, label }, i) => (
              <li key={label} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden className="me-4 hidden h-3 w-px bg-gold/40 sm:block" /> : null}
                <Icon size={15} className="text-gold" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* product shrine */}
        <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
          <div className="relative h-[390px] w-full sm:h-[540px] lg:h-[clamp(520px,72vh,760px)]">
            {/* arch panel */}
            <div className="absolute inset-x-[9%] top-[6%] bottom-0 rounded-t-[999px] bg-gradient-to-b from-cream/90 via-cream/60 to-transparent" />
            <div
              aria-hidden
              className="absolute inset-x-[13%] top-[10%] bottom-6 z-10 rounded-t-[999px] border border-gold/30"
            />
            <div
              aria-hidden
              className="absolute inset-x-[4%] top-[16%] bottom-[8%] rounded-[999px] opacity-40 blur-[2px]"
              style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(210,175,106,0.35), transparent 62%)" }}
            />

            {image ? (
              <div className="absolute inset-x-[9%] top-[6%] bottom-0 overflow-hidden rounded-t-[999px]">
                <Image
                  src={heroImage}
                  alt={
                    locale === "ar"
                      ? "زجاجة زيت زيتون بكر ممتاز من آل سليمان"
                      : "Alsuliman extra virgin olive oil bottle"
                  }
                  fill
                  priority
                  sizes="(max-width: 1024px) 60vw, 32vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-end justify-center pb-[2%]">
                <Image
                  src={heroImage}
                  alt={
                    locale === "ar"
                      ? "زجاجة زيت زيتون بكر ممتاز من آل سليمان"
                      : "Alsuliman extra virgin olive oil bottle"
                  }
                  width={391}
                  height={1476}
                  priority
                  sizes="(max-width: 1024px) 60vw, 32vw"
                  className="h-[90%] w-auto object-contain drop-shadow-[0_28px_36px_rgba(38,49,31,0.28)]"
                  style={{
                    maskImage: "linear-gradient(to bottom, #000 93%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, #000 93%, transparent 100%)",
                  }}
                />
              </div>
            )}

            <div className="absolute bottom-[16%] end-[2%] hidden sm:block">
              <Seal locale={locale} className="shadow-soft" />
            </div>

            <p className="absolute bottom-[1%] end-0 max-w-[9rem] text-end text-[0.62rem] leading-5 tracking-wide text-ink-muted/80">
              {dict.hero.caption}
            </p>
          </div>
        </div>
      </div>

      <div className="container-page relative">
        <div className="hairline" />
        <div className="flex items-center justify-between py-4 text-[0.6rem] tracking-[0.3em] text-ink-muted/60">
          <span>{locale === "ar" ? "زيت زيتون بكر ممتاز" : "EXTRA VIRGIN OLIVE OIL"}</span>
          <span className="hidden sm:inline">{dict.hero.scroll}</span>
          <span>{locale === "ar" ? "مصر" : "EGYPT"}</span>
        </div>
      </div>
    </section>
  );
}
