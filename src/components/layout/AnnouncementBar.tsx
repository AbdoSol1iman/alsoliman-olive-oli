import type { Locale } from "@/lib/products";

export function AnnouncementBar({ locale, items }: { locale: Locale; items: string[] }) {
  const list = items.length > 0 ? items : [];

  return (
    <div className="relative z-40 border-b border-gold/20 bg-forest-deep text-ivory">
      <div className="container-page flex h-9 items-center justify-center gap-4 overflow-hidden">
        <div className="flex items-center gap-4 text-[0.7rem] tracking-wide">
          {list.map((item, i) => (
            <span key={item} className="flex items-center gap-4">
              {i > 0 ? (
                <span aria-hidden className="hidden size-1 rounded-full bg-gold/70 sm:block" />
              ) : null}
              <span className={i > 0 ? "hidden sm:inline" : ""}>{item}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
