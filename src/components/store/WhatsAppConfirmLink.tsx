"use client";

import { trackEvent } from "@/lib/analytics";
import { Whatsapp } from "@/components/ui/Icons";

/**
 * The WhatsApp hand-off is tracked as a link-open attempt — never as a sent
 * message. The event id is shared with the checkout auto-open so one order
 * counts once even if both paths happen.
 */
export function WhatsAppConfirmLink({
  href,
  reference,
  label,
}: {
  href: string;
  reference: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      data-testid="order-whatsapp"
      onClick={() =>
        trackEvent("WhatsAppOpened", {
          orderReference: reference,
          eventId: `wa:${reference}`,
          metadata: { channel: "confirmation_button" },
        })
      }
      className="mt-5 inline-flex h-[3.4rem] w-full items-center justify-center gap-2.5 rounded-xs bg-forest px-8 text-[0.95rem] font-medium tracking-wide text-ivory transition-colors hover:bg-forest-deep sm:w-auto"
    >
      <Whatsapp size={19} />
      {label}
    </a>
  );
}
