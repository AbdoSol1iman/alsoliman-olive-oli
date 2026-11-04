import { Whatsapp } from "@/components/ui/Icons";
import type { Dictionary } from "@/lib/i18n";

export function WhatsAppButton({
  dict,
  whatsappNumber,
}: {
  dict: Dictionary;
  whatsappNumber: string;
}) {
  if (!whatsappNumber) return null;
  const href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(dict.whatsapp.defaultMessage)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={dict.whatsapp.label}
      className="group fixed bottom-5 end-5 z-30 inline-flex items-center gap-0 overflow-hidden rounded-full border border-gold/40 bg-forest pl-3.5 pr-3.5 text-ivory shadow-lift transition-all duration-500 ease-[var(--ease-out-soft)] hover:border-gold hover:bg-forest-deep md:bottom-7 md:end-7"
    >
      <span className="grid size-11 place-items-center text-gold-pale">
        <Whatsapp size={22} />
      </span>
      <span className="max-w-0 whitespace-nowrap text-[0.78rem] opacity-0 transition-all duration-500 group-hover:max-w-[10rem] group-hover:pl-1 group-hover:pr-3 group-hover:opacity-100">
        {dict.whatsapp.label}
      </span>
    </a>
  );
}
