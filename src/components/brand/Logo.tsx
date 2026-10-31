import { brand } from "@/lib/config";
import { cx } from "@/lib/format";
import type { Locale } from "@/lib/products";

/* ------------------------------------------------------------------ */
/* Mark — stylised bottle with olive branches. Temporary wordmark art   */
/* until the original logo file is supplied (see README / SETUP_TODO).  */
/* ------------------------------------------------------------------ */
export function BrandMark({ className = "", size = 44 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 112) / 88}
      viewBox="0 0 88 112"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="slm-gold" x1="18" y1="8" x2="70" y2="110" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EFD3A0" />
          <stop offset="0.42" stopColor="#DCB170" />
          <stop offset="1" stopColor="#B98C46" />
        </linearGradient>
        <linearGradient id="slm-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#9AA971" />
          <stop offset="1" stopColor="#6E7C4C" />
        </linearGradient>
      </defs>

      {/* olive branches */}
      <g fill="url(#slm-leaf)">
        <path d="M62 40c6-6 13-8 20-5-2 8-8 12-16 11-2 0-3-2-4-6Z" opacity="0.95" />
        <path d="M60 47c7-2 13 0 17 5-5 6-12 6-17 1-1.4-1.4-1-4 0-6Z" opacity="0.8" />
        <path d="M26 43c-6-5-13-6-19-3 2 7 8 11 15 9 2-.4 3-2.4 4-6Z" opacity="0.95" />
        <path d="M28 51c-6-1-12 1-15 6 5 5 12 5 15 0 1.2-1.5.8-4 0-6Z" opacity="0.8" />
        <path d="M57 62c6-3 12-2 16 2-4 6-11 7-16 3-1.3-1-1-3.4 0-5Z" opacity="0.6" />
      </g>
      <g fill="#2F3A26">
        <circle cx="70" cy="53" r="3.4" />
        <circle cx="18" cy="59" r="3" />
        <circle cx="62" cy="70" r="2.6" />
      </g>

      {/* bottle */}
      <rect x="38.5" y="4" width="11" height="9" rx="2" fill="#C79A55" />
      <rect x="37" y="11.5" width="14" height="2.6" rx="1.3" fill="#B3873F" />
      <path
        d="M40 14h8v11c0 5 10 7 10 17v59a5 5 0 0 1-5 5H35a5 5 0 0 1-5-5V42c0-10 10-12 10-17V14Z"
        fill="url(#slm-gold)"
      />
      <path
        d="M39.5 30c-2 3.6-4.5 5.6-4.5 10.6V98"
        stroke="#F6E0B4"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <g opacity="0.9">
        <path d="M37 58h18a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H37a3 3 0 0 1-3-3V61a3 3 0 0 1 3-3Z" fill="#FFF6E4" opacity="0.62" />
        <path d="M42 74c1.6-3.6 1-6.6-1-9-2.6 2.4-3.2 5.6-1.7 8.4.8 1.4 1.8 2 2.7.6Z" fill="#7C8A57" />
        <path d="M44.5 64.5c.6 2.6 2.2 4 4.6 4.4-.4-2.6-2-4-4.6-4.4Z" fill="#7C8A57" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
export function Logo({
  locale,
  variant = "inline",
  tone = "forest",
  className,
}: {
  locale: Locale;
  variant?: "inline" | "stacked";
  tone?: "forest" | "ivory";
  className?: string;
}) {
  const name = locale === "ar" ? brand.fullNameAr : brand.fullNameEn;
  const subline = locale === "ar" ? brand.markSublineAr : brand.markSublineEn;

  if (brand.logoMode === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logoImage} alt={name} className={cx("h-12 w-auto", className)} />;
  }

  if (variant === "stacked") {
    return (
      <span className={cx("inline-flex flex-col items-center text-center", className)}>
        <BrandMark size={64} />
        <span
          className={cx(
            "mt-2 font-display text-[1.7rem] leading-none tracking-tight",
            tone === "ivory" ? "text-gold-pale" : "text-forest",
          )}
        >
          {brand.nameAr === "آل سليمان" && locale === "ar" ? "آل سليمان" : brand.nameEn}
        </span>
        <span className={cx("mt-1.5 text-[0.6rem] tracking-[0.3em]", tone === "ivory" ? "text-sage" : "text-ink-muted")}>
          {subline}
        </span>
      </span>
    );
  }

  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={34} />
      <span className="flex flex-col leading-none">
        <span
          className={cx(
            "font-display text-[1.55rem] leading-[1.1] tracking-tight",
            tone === "ivory" ? "text-gold-pale" : "text-forest",
          )}
        >
          {locale === "ar" ? "آل سليمان" : "Alsuliman"}
        </span>
        <span
          className={cx(
            "mt-1 text-[0.55rem] tracking-[0.26em]",
            tone === "ivory" ? "text-sage" : "text-ink-muted",
          )}
        >
          {locale === "ar" ? "زيت زيتون بكر ممتاز" : "EXTRA VIRGIN"}
        </span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Decorative olive branch used as background art                      */
/* ------------------------------------------------------------------ */
export function OliveBranch({
  className = "",
  flip = false,
  tone = "#B79A55",
}: {
  className?: string;
  flip?: boolean;
  tone?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 320"
      fill="none"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 306C64 246 104 174 148 96c14-24 30-46 48-64"
        stroke={tone}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      {[
        [58, 250, -32],
        [86, 214, 24],
        [104, 176, -26],
        [126, 140, 30],
        [146, 106, -22],
        [168, 70, 26],
        [190, 38, -18],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path
            d="M0 0c14-16 32-20 46-12-6 18-22 26-42 22-3-.4-4-4-4-10Z"
            stroke={tone}
            strokeWidth="1.2"
            fill="none"
          />
          <path d="M2 3c10 3 22 1 32-6" stroke={tone} strokeWidth="0.9" opacity="0.7" fill="none" />
        </g>
      ))}
      <circle cx="120" cy="196" r="6.5" fill={tone} opacity="0.35" />
      <circle cx="158" cy="128" r="5" fill={tone} opacity="0.25" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Round quality seal                                                  */
/* ------------------------------------------------------------------ */
export function Seal({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <span
      className={cx(
        "relative inline-flex size-24 shrink-0 flex-col items-center justify-center rounded-full text-center",
        "border border-gold/50 bg-ivory/85 text-forest backdrop-blur-sm",
        className,
      )}
    >
      <span className="absolute inset-[5px] rounded-full border border-gold/30" />
      <span className="font-display text-[0.95rem] leading-tight">
        {locale === "ar" ? "بكر" : "Extra"}
      </span>
      <span className="font-display text-[0.95rem] leading-tight">
        {locale === "ar" ? "ممتاز" : "Virgin"}
      </span>
      <span className="mt-1 text-[0.45rem] tracking-[0.24em] text-gold">EST · SLM</span>
    </span>
  );
}
