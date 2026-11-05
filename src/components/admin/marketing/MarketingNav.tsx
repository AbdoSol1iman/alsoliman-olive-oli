"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/format";

const links = [
  { href: "/admin/marketing", label: "نظرة عامة", exact: true },
  { href: "/admin/marketing/campaigns", label: "الحملات" },
  { href: "/admin/marketing/media-buyers", label: "المشترون الإعلاميون" },
  { href: "/admin/marketing/funnel", label: "مسار التحويل" },
  { href: "/admin/marketing/customers", label: "اكتساب العملاء" },
  { href: "/admin/marketing/products", label: "المنتجات" },
  { href: "/admin/marketing/geography", label: "المحافظات" },
  { href: "/admin/marketing/attribution", label: "الإسناد" },
  { href: "/admin/marketing/cod", label: "جودة COD" },
  { href: "/admin/marketing/data", label: "إدخال البيانات" },
  { href: "/admin/marketing/reports", label: "التقارير" },
];

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="أقسام تحليلات التسويق"
      className="flex gap-1 overflow-x-auto border-b border-gold/20 pb-px print:hidden"
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.76rem] transition-colors",
              active
                ? "border-gold text-forest"
                : "border-transparent text-ink-muted hover:border-gold/30 hover:text-forest",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
