"use client";

import { useState } from "react";
import { OliveBranch } from "@/components/brand/Logo";
import { flags } from "@/lib/config";
import type { Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";

export function Newsletter({ dict }: { dict: Dictionary }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "invalid" | "ok" | "unavailable">("idle");
  const configured = flags.newsletterBackend;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      setStatus("unavailable");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("invalid");
      return;
    }
    // Integration point: POST /api/newsletter (requires NEWSLETTER_WEBHOOK_URL).
    setStatus("ok");
    setEmail("");
  };

  return (
    <section className="relative overflow-hidden bg-forest-deep py-16 text-ivory md:py-20" aria-labelledby="newsletter-title">
      <OliveBranch
        className="pointer-events-none absolute -end-10 top-1/2 h-[320px] w-auto -translate-y-1/2 opacity-[0.12]"
        tone="#D2AF6A"
      />
      <div className="container-page relative grid gap-10 md:grid-cols-[1fr_1fr] md:items-center md:gap-16">
        <div>
          <p className="eyebrow text-gold-soft">{dict.newsletter.eyebrow}</p>
          <h2 id="newsletter-title" className="mt-4 text-[clamp(1.7rem,3.4vw,2.5rem)] text-ivory">
            {dict.newsletter.title}
          </h2>
          <p className="mt-3 max-w-md text-[0.88rem] leading-7 text-sage/80">{dict.newsletter.body}</p>
        </div>

        <div>
          <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="newsletter-email" className="sr-only">
                {dict.newsletter.placeholder}
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setStatus("idle");
                }}
                placeholder={dict.newsletter.placeholder}
                disabled={!configured}
                aria-invalid={status === "invalid"}
                className="h-12 w-full border-b border-gold/35 bg-transparent px-1 text-[0.9rem] text-ivory outline-none transition-colors placeholder:text-sage/50 focus:border-gold disabled:opacity-50"
              />
            </div>
            <Button type="submit" variant="gold" size="md" disabled={!configured} className="shrink-0">
              {dict.newsletter.cta}
            </Button>
          </form>

          <p
            className="mt-3 min-h-6 text-[0.72rem] text-sage/70"
            role="status"
            aria-live="polite"
          >
            {status === "invalid"
              ? dict.newsletter.invalid
              : status === "ok"
                ? dict.newsletter.success
                : status === "unavailable"
                  ? dict.newsletter.disabled
                  : configured
                    ? dict.newsletter.note
                    : dict.newsletter.disabled}
          </p>
          {status === "ok" ? (
            <p className="mt-1 flex items-center gap-1.5 text-[0.72rem] text-gold-soft">
              <Check size={13} /> {dict.newsletter.success}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
