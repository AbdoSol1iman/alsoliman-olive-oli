"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatusAction, addOrderNoteAction, deleteOrderNoteAction } from "@/app/actions/orders-admin";
import type { OrderStatus } from "@/lib/orders";
import { humanError, MiniButton, STATUS_LABELS, STATUS_ORDER } from "./ui";

export function OrderStatusForm({ reference, status }: { reference: string; status: OrderStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = (formData: FormData) => {
    setError("");
    setDone(false);
    startTransition(async () => {
      const result = await setOrderStatusAction(formData);
      if (!result.ok) setError(humanError(result.error));
      else {
        setDone(true);
        router.refresh();
      }
    });
  };

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="reference" value={reference} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="status"
          defaultValue={status}
          className="h-10 border border-forest/20 bg-ivory px-3 text-[0.8rem] text-charcoal outline-none focus:border-gold"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-xs bg-forest px-4 text-[0.78rem] text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
        >
          {pending ? "جارٍ التحديث…" : "تحديث الحالة"}
        </button>
      </div>
      {error ? <p className="text-[0.72rem] text-red-800">{error}</p> : null}
      {done ? <p className="text-[0.72rem] text-forest">تم تحديث الحالة ✓</p> : null}
    </form>
  );
}

export function OrderNotes({
  orderId,
  notes,
}: {
  orderId: string;
  notes: { id: string; body: string; author: string; created_at: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const add = (formData: FormData) => {
    const body = String(formData.get("body") ?? "");
    setError("");
    startTransition(async () => {
      const result = await addOrderNoteAction(orderId, body);
      if (!result.ok) setError(humanError(result.error));
      else {
        formRef.current?.reset();
        router.refresh();
      }
    });
  };

  const remove = (noteId: string) => {
    if (!window.confirm("حذف الملاحظة؟")) return;
    setError("");
    startTransition(async () => {
      const result = await deleteOrderNoteAction(noteId, orderId);
      if (!result.ok) setError(humanError(result.error));
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <form ref={formRef} action={add} className="space-y-2">
        <label htmlFor="note" className="block text-[0.75rem] text-forest">
          ملاحظة داخلية (لا يراها العميل)
        </label>
        <textarea
          id="note"
          name="body"
          rows={2}
          required
          placeholder="مثال: العميل طلب التوصيل بعد الظهر…"
          className="w-full border border-forest/20 bg-ivory px-3 py-2 text-[0.82rem] text-charcoal outline-none focus:border-gold"
        />
        <div className="flex items-center gap-3">
          <MiniButton
            type="submit"
            disabled={pending}
            className="h-9 border-forest bg-forest px-4 text-ivory hover:bg-forest-deep"
          >
            {pending ? "جارٍ الإضافة…" : "إضافة ملاحظة"}
          </MiniButton>
          {error ? <span className="text-[0.72rem] text-red-800">{error}</span> : null}
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-[0.78rem] text-ink-muted">لا توجد ملاحظات بعد.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border-s-2 border-gold/40 ps-3">
              <p className="text-[0.8rem] leading-7 text-charcoal">{note.body}</p>
              <div className="mt-1 flex items-center gap-3 text-[0.68rem] text-ink-muted">
                <span>{note.author}</span>
                <span>{new Date(note.created_at).toLocaleString("ar-EG")}</span>
                <button
                  type="button"
                  onClick={() => remove(note.id)}
                  disabled={pending}
                  className="text-red-900 hover:underline disabled:opacity-50"
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
