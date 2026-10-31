import Link from "next/link";
import { BrandMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="paper flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <BrandMark size={54} className="mx-auto opacity-80" />
        <p className="mt-6 font-display text-[3.5rem] leading-none text-gold/50">404</p>
        <h1 className="mt-3 text-[clamp(1.5rem,3.6vw,2.1rem)]">الصفحة غير موجودة</h1>
        <p className="mt-3 text-[0.88rem] leading-8 text-ink-muted">
          ربما تم نقل الصفحة أو أن الرابط غير صحيح. / This page could not be found.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/ar"
            className="inline-flex h-11 items-center rounded-xs bg-forest px-6 text-[0.82rem] text-ivory transition-colors hover:bg-forest-deep"
          >
            الرئيسية
          </Link>
          <Link
            href="/ar/shop"
            className="inline-flex h-11 items-center rounded-xs border border-forest/25 px-6 text-[0.82rem] text-forest transition-colors hover:border-forest/60"
          >
            متجر المنتجات
          </Link>
        </div>
      </div>
    </div>
  );
}
