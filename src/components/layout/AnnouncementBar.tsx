import { announcements } from "@/lib/config";
import type { Locale } from "@/lib/products";

export function AnnouncementBar({ locale }: { locale: Locale }) {
  const items = announcements[locale] ?? announcements.ar;

  return (
    <div className="relative z-40 border-b border-gold/20 bg-forest-deep text-ivory">
      <div className="container-page flex h-9 items-center justify-center gap-4 overflow-hidden">
        <div className="flex items-center gap-4 text-[0.7rem] tracking-wide">
          {items.map((item, i) => (
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
