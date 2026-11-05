import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { parseRange, rangeHref } from "@/lib/date-range";
import { MARKETING_REPORTS } from "@/lib/marketing-reports";
import { AdminCard } from "@/components/admin/ui";
import { RangeFilter } from "@/components/admin/marketing/RangeFilter";

export const instant = false;

export const metadata = { title: "تقارير التسويق · Admin" };

export default async function MarketingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const range = parseRange(params);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">تقارير التسويق</h1>
        <p className="mt-1 max-w-3xl text-[0.82rem] leading-6 text-ink-muted">
          كل تقرير يحتوي الفترة المحددة ومقارنتها بالفترة السابقة، والمؤشرات والجداول
          والرسوم المناسبة. الطباعة تُنتج PDF من المتصفح دون أي مكتبة إضافية.
        </p>
      </div>

      <RangeFilter range={range} basePath="/admin/marketing/reports" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MARKETING_REPORTS.map((report) => (
          <AdminCard key={report.slug} title={report.title} description={report.description}>
            <ul className="mb-4 space-y-1.5">
              {report.includes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.74rem] leading-5 text-ink-muted">
                  <span aria-hidden className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={rangeHref(`/admin/marketing/reports/${report.slug}`, range)}
                className="inline-flex h-8 items-center rounded-xs bg-forest px-3 text-[0.72rem] text-ivory hover:bg-forest-deep"
              >
                فتح التقرير
              </Link>
              <Link
                href={rangeHref("/admin/marketing/export", range, { type: report.slug })}
                className="inline-flex h-8 items-center rounded-xs border border-forest/20 px-3 text-[0.72rem] text-forest hover:border-forest"
              >
                ⬇ CSV
              </Link>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="border border-gold/25 bg-cream/30 px-4 py-3 text-[0.72rem] leading-6 text-ink-muted">
        تقارير CSV متوافقة مع Excel وتُصدَّر بترميز UTF-8 مع BOM للحفاظ على العربية.
        التصدير الكامل لكل أنواع التقارير متاح من صفحة كل قسم، وتحميل الملف يتطلب جلسة
        إدارة صالحة.
      </div>
    </div>
  );
}
