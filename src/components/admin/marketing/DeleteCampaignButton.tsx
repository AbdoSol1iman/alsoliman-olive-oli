"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCampaignAction } from "@/app/actions/marketing";

export function DeleteCampaignButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const remove = () => {
    if (pending) return;
    if (
      !window.confirm(
        `حذف الحملة «${name}»؟ لا يمكن الحذف إذا كانت لها مصاريف مسجلة أو طلبات منسوبة. استخدم حالة «منتهية» بدلًا من ذلك للحفاظ على التاريخ.`,
      )
    ) {
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await deleteCampaignAction(id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(
          result.error === "campaign_in_use"
            ? "لا يمكن حذف حملة لها مصاريف أو طلبات منسوبة. غيّر حالتها إلى «منتهية»."
            : "فشل حذف الحملة، حاول مرة أخرى.",
        );
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="text-[0.7rem] text-red-800 underline decoration-red-800/30 underline-offset-4 hover:decoration-red-800 disabled:opacity-50"
      >
        {pending ? "جارٍ الحذف…" : "حذف"}
      </button>
      {error ? <p className="mt-1 max-w-48 text-[0.64rem] leading-4 text-red-800">{error}</p> : null}
    </div>
  );
}
