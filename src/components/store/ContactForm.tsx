"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";
import { contact } from "@/lib/config";
import { cx } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";

export function ContactForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [error, setError] = useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_CONTACT_ENDPOINT);
  const isAr = locale === "ar";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      setError(isAr ? "من فضلك اكتب الاسم والرسالة." : "Please add your name and message.");
      return;
    }
    setError("");
    if (!configured) {
      setSent(true);
      return;
    }
    // Integration point: POST to NEXT_PUBLIC_CONTACT_ENDPOINT
    setSent(true);
  };

  const field = "h-12 w-full border border-forest/20 bg-ivory px-4 text-[0.88rem] outline-none transition-colors placeholder:text-ink-muted/50 focus:border-gold";

  return (
    <form onSubmit={submit} noValidate className="border border-gold/20 bg-ivory p-6 md:p-8">
      {sent ? (
        <div className="py-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-gold/40 text-gold">
            <Check size={22} />
          </span>
          <p className="mt-4 font-display text-[1.3rem] text-forest">
            {configured ? dict.contact.sent : dict.contact.notConfigured}
          </p>
          {!configured && contact.whatsappNumber ? (
            <a
              href={`https://wa.me/${contact.whatsappNumber}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-block text-[0.8rem] text-forest underline decoration-gold/50 underline-offset-4"
            >
              {dict.whatsapp.label}
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <h2 className="text-[1.35rem]">{dict.contact.eyebrow}</h2>
          <p className="mt-1.5 text-[0.82rem] text-ink-muted">{dict.contact.body}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block text-[0.75rem] text-forest">
                {dict.contact.name} *
              </label>
              <input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={field}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="c-phone" className="mb-1.5 block text-[0.75rem] text-forest">
                {dict.contact.phone}
              </label>
              <input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={field}
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-email" className="mb-1.5 block text-[0.75rem] text-forest">
                {dict.contact.email}
              </label>
              <input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={field}
                dir="ltr"
                autoComplete="email"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-message" className="mb-1.5 block text-[0.75rem] text-forest">
                {dict.contact.message} *
              </label>
              <textarea
                id="c-message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={cx(field, "h-auto resize-y py-3 leading-7")}
              />
            </div>
          </div>

          {error ? <p className="mt-3 text-[0.75rem] text-red-800">{error}</p> : null}

          <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto">
            {dict.contact.send}
          </Button>

          {!configured ? (
            <p className="mt-3 text-[0.7rem] leading-6 text-ink-muted">{dict.contact.notConfigured}</p>
          ) : null}
        </>
      )}
    </form>
  );
}
