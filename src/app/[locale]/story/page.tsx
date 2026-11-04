import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { getSiteDictionary } from "@/lib/content";
import type { Locale } from "@/lib/products";

const isLocale = (v: string): v is Locale => v === "ar" || v === "en";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale !== "en";
  return {
    title: isAr ? "قصتنا" : "Our story",
    description: isAr
      ? "قصة آل سليمان مع زيت الزيتون: عناية بالاختيار، وحفظ للطعم حتى المائدة."
      : "The Alsuliman story: care in selection, and flavour preserved all the way to the table.",
    alternates: { canonical: `/${locale}/story`, languages: { ar: "/ar/story", en: "/en/story" } },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getSiteDictionary(locale);
  const isAr = locale === "ar";

  return (
    <>
      <PageHeader eyebrow={dict.story.eyebrow} title={dict.about.title} body={dict.about.body} />

      <section className="paper py-16 md:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-20">
          <div>
            <blockquote className="border-s-2 border-gold/50 ps-6">
              <p className="font-display text-[clamp(1.4rem,3vw,2rem)] leading-[1.8] text-forest">
                {dict.story.quote}
              </p>
            </blockquote>
            <div className="mt-8 space-y-5 text-[0.95rem] leading-9 text-ink-muted">
              {dict.story.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p>
                {isAr
                  ? "نفضّل أن نتحدث عن ما نفعله فعلًا: اختيار الزيت، التعبئة، والتوصيل. الباقي تتركه لك ولتجربتك."
                  : "We prefer to talk about what we actually do: choosing the oil, bottling it, and delivering it. The rest we leave to your own experience."}
              </p>
            </div>
            <p className="mt-10 font-display text-[1.8rem] text-gold/80">{dict.story.signature}</p>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm">
            <div className="absolute inset-0 translate-x-3 -translate-y-3 border border-gold/30" />
            <div className="relative size-full overflow-hidden bg-cream/50">
              <div aria-hidden className="absolute inset-x-[16%] top-[8%] bottom-0 rounded-t-[999px] border border-gold/25" />
              <Image
                src="/products/bottle-cutout.png"
                alt={
                  isAr
                    ? "زجاجة زيت زيتون بكر ممتاز من آل سليمان"
                    : "Alsuliman extra virgin olive oil bottle"
                }
                fill
                loading="eager"
                sizes="(max-width: 1024px) 70vw, 34vw"
                className="object-contain object-bottom p-[15%] pb-[3%] drop-shadow-[0_20px_30px_rgba(38,49,31,0.22)]"
                style={{
                  maskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, #000 94%, transparent 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gold/15 bg-forest py-16 text-ivory md:py-20">
        <div className="container-page grid gap-10 sm:grid-cols-3">
          {(isAr
            ? [
                { t: "الاختيار", b: "نبدأ من الزيتون، لا من العبوة." },
                { t: "الحفظ", b: "زجاج داكن وتخزين سليم يحمي الطعم." },
                { t: "الوصول", b: "متابعة الطلب حتى بابك." },
              ]
            : [
                { t: "Selection", b: "We start with the olives, not the bottle." },
                { t: "Protection", b: "Dark glass and proper storage keep the flavour." },
                { t: "Delivery", b: "We follow the order to your door." },
              ]
          ).map((item, i) => (
            <div key={item.t} className="border-t border-gold/30 pt-5">
              <span className="text-[0.65rem] tracking-[0.22em] text-gold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-2 text-[1.35rem] text-ivory">{item.t}</h2>
              <p className="mt-2 text-[0.85rem] leading-7 text-sage/80">{item.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="paper py-16 text-center md:py-20">
        <div className="container-page">
          <h2 className="text-[clamp(1.6rem,3.4vw,2.4rem)]">
            {isAr ? "جرّب الزيت بنفسك" : "Try the oil for yourself"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.9rem] leading-8 text-ink-muted">
            {isAr
              ? "ثلاثة أحجام، نفس العناية. اختر ما يناسب مائدتك."
              : "Three sizes, the same care. Pick what fits your table."}
          </p>
          <ButtonLink href={`/${locale}/shop`} size="lg" className="mt-8">
            {dict.hero.ctaPrimary}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
