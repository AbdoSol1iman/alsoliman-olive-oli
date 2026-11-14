"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand/Logo";
import { logoutAction } from "@/app/actions/admin";
import { cx } from "@/lib/format";

type IconKind =
  | "grid"
  | "box"
  | "tag"
  | "receipt"
  | "users"
  | "star"
  | "image"
  | "home"
  | "file"
  | "chart"
  | "gear"
  | "user"
  | "logout";

function NavIcon({ kind }: { kind: IconKind }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8Z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M12 2H4v8l9.5 9.5a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0 0-2.8L12 2Z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M5 3v18l2.5-1.6L10 21l2-1.6L14 21l2.5-1.6L19 21V3H5Z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5M16 5.5a3 3 0 0 1 0 5.6M17.5 15c2 .7 3.2 2.3 3.6 5" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M4 11l8-7 8 7" />
          <path d="M6 9.5V20h12V9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7V3Z" />
          <path d="M14 3v4h4M10 12h5M10 16h5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V4" />
          <path d="M4 20h16" />
          <path d="M8 16v-4M12.5 16V8M17 16v-6" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1-3.6 3.7-5.5 7-5.5s6 1.9 7 5.5" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M14 4H6v16h8" />
          <path d="M11 12h9M17 8.5l3.5 3.5L17 15.5" />
        </svg>
      );
  }
}

const links: { href: string; label: string; kind: IconKind; exact?: boolean }[] = [
  { href: "/admin", label: "نظرة عامة", kind: "grid", exact: true },
  { href: "/admin/products", label: "المنتجات", kind: "box" },
  { href: "/admin/categories", label: "التصنيفات", kind: "tag" },
  { href: "/admin/orders", label: "الطلبات", kind: "receipt" },
  { href: "/admin/reviews", label: "التقييمات", kind: "star" },
  { href: "/admin/marketing", label: "تحليلات التسويق", kind: "chart" },
  { href: "/admin/customers", label: "العملاء", kind: "users" },
  { href: "/admin/media", label: "مكتبة الوسائط", kind: "image" },
  { href: "/admin/homepage", label: "محرر الصفحة الرئيسية", kind: "home" },
  { href: "/admin/content", label: "محتوى الموقع", kind: "file" },
  { href: "/admin/reports", label: "التقارير", kind: "chart" },
  { href: "/admin/settings", label: "الإعدادات", kind: "gear" },
  { href: "/admin/profile", label: "الملف الشخصي", kind: "user" },
];

export function Sidebar({
  name,
  email,
  pendingReviewsCount = 0,
}: {
  name: string;
  email: string;
  pendingReviewsCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const nav = (
    <nav aria-label="قائمة الإدارة" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {links.map((l) => {
        const active = isActive(l.href, l.exact);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-xs px-3 py-2.5 text-[0.82rem] transition-colors duration-200",
              active
                ? "bg-gold/15 text-gold-pale"
                : "text-sage/85 hover:bg-ivory/5 hover:text-ivory",
            )}
          >
            <NavIcon kind={l.kind} />
            <span>{l.label}</span>
            {l.href === "/admin/reviews" && pendingReviewsCount > 0 ? (
              <span className="ms-auto rounded-full bg-gold/25 px-1.5 py-0.5 text-[0.68rem] font-bold text-gold-pale">
                {pendingReviewsCount}
              </span>
            ) : active ? (
              <span aria-hidden className="ms-auto size-1.5 rounded-full bg-gold" />
            ) : null}
          </Link>
        );
      })}

      <form action={logoutAction} className="mt-4 border-t border-gold/15 pt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xs px-3 py-2.5 text-[0.82rem] text-sage/85 transition-colors hover:bg-ivory/5 hover:text-ivory"
        >
          <NavIcon kind="logout" />
          <span>تسجيل الخروج</span>
        </button>
      </form>
    </nav>
  );

  const identity = (
    <div className="border-b border-gold/15 px-5 py-4">
      <div className="flex items-center gap-3">
        <BrandMark size={30} />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-[1rem] text-gold-pale">لوحة التحكم</p>
          <p className="truncate text-[0.6rem] tracking-[0.2em] text-sage/70">ALSULIMAN ADMIN</p>
        </div>
      </div>
      <div className="mt-3 rounded-xs bg-ivory/5 px-3 py-2">
        <p className="truncate text-[0.75rem] text-ivory">{name || email}</p>
        <p className="truncate text-[0.65rem] text-sage/70" dir="ltr">
          {email}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col bg-forest-deep text-ivory print:hidden lg:flex">
        {identity}
        {nav}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-gold/20 bg-forest-deep px-4 text-ivory print:hidden lg:hidden">
        <div className="flex items-center gap-2.5">
          <BrandMark size={22} />
          <span className="font-display text-[0.95rem] text-gold-pale">لوحة التحكم</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          className="grid size-9 place-items-center rounded-xs border border-gold/30 text-gold-pale"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 print:hidden lg:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-forest-deep/60 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-forest-deep text-ivory shadow-lift">
            {identity}
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
