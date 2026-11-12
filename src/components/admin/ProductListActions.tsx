"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  deleteProductAction,
  moveProductAction,
  toggleProductFlagAction,
} from "@/app/actions/catalog";
import { humanError, MiniButton, Toggle } from "./ui";

export function ProductFlags({
  id,
  active,
  featured,
  comingSoon,
}: {
  id: string;
  active: boolean;
  featured: boolean;
  comingSoon: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Toggle state flips immediately; React reverts it automatically if the
  // action fails, so the switch never waits on the remote database round trip.
  const [optimistic, setOptimistic] = useOptimistic(
    { active, featured, comingSoon },
    (state, change: { flag: "active" | "featured" | "comingSoon"; value: boolean }) => ({
      ...state,
      [change.flag]: change.value,
    }),
  );

  const set = (flag: "active" | "featured" | "comingSoon", value: boolean) => {
    setError("");
    startTransition(async () => {
      setOptimistic({ flag, value });
      // The action revalidates `/admin/products`, so Next includes the fresh
      // route in the action response — no second `router.refresh()` needed.
      const result = await toggleProductFlagAction(id, flag, value);
      if (!result.ok) setError(humanError(result.error));
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <label className="flex items-center gap-2 text-[0.72rem] text-ink-muted">
        <Toggle label="إظهار في المتجر" checked={optimistic.active} onChange={(v) => set("active", v)} disabled={pending} />
        {optimistic.active ? "ظاهر" : "مخفي"}
      </label>
      <label className="flex items-center gap-2 text-[0.72rem] text-ink-muted">
        <Toggle label="مميز في الرئيسية" checked={optimistic.featured} onChange={(v) => set("featured", v)} disabled={pending} />
        مميز
      </label>
      <label className="flex items-center gap-2 text-[0.72rem] text-ink-muted">
        <Toggle label="قريبًا" checked={optimistic.comingSoon} onChange={(v) => set("comingSoon", v)} disabled={pending} />
        قريبًا
      </label>
      {error ? <p className="text-[0.68rem] text-red-800">{error}</p> : null}
    </div>
  );
}

export function ProductRowActions({
  id,
  name,
  canUp,
  canDown,
}: {
  id: string;
  name: string;
  canUp: boolean;
  canDown: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const move = (direction: "up" | "down") => {
    setError("");
    startTransition(async () => {
      const result = await moveProductAction(id, direction);
      if (!result.ok) setError(humanError(result.error));
    });
  };

  const remove = () => {
    if (!window.confirm(`حذف المنتج «${name}» نهائيًا؟ لا يمكن التراجع.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (!result.ok) setError(humanError(result.error));
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <MiniButton onClick={() => move("up")} disabled={!canUp || pending} aria-label="تحريك لأعلى">
        ↑
      </MiniButton>
      <MiniButton onClick={() => move("down")} disabled={!canDown || pending} aria-label="تحريك لأسفل">
        ↓
      </MiniButton>
      <MiniButton onClick={remove} disabled={pending} className="border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory">
        حذف
      </MiniButton>
      {error ? <p className="w-full text-[0.68rem] text-red-800">{error}</p> : null}
    </div>
  );
}
