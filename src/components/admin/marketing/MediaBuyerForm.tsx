"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMediaBuyerAction } from "@/app/actions/marketing";
import { PLATFORMS, PLATFORM_LABELS, type MediaBuyer } from "@/lib/marketing-types";
import {
  Field,
  FormMessage,
  TextArea,
  TextInput,
  humanError,
} from "@/components/admin/ui";

export function MediaBuyerForm({ buyer }: { buyer?: MediaBuyer }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setSuccess("");
    startTransition(async () => {
      const result = await saveMediaBuyerAction(data);
      if (result.ok) {
        setSuccess(buyer ? "تم تحديث الملف." : "تم إنشاء ملف المشتري الإعلامي.");
        if (buyer) {
          router.push("/admin/marketing/media-buyers");
        } else {
          form.reset();
        }
        router.refresh();
      } else {
        setError(humanError(result.error));
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {buyer ? <input type="hidden" name="id" value={buyer.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="الاسم الكامل"
          name="fullName"
          required
          defaultValue={buyer?.full_name ?? ""}
          placeholder="اسم المشتري الإعلامي"
        />
        <TextInput
          label="البريد الإلكتروني"
          name="email"
          type="email"
          defaultValue={buyer?.email ?? ""}
          placeholder="name@example.com"
          dir="ltr"
        />
        <TextInput
          label="تاريخ البدء"
          name="startDate"
          type="date"
          defaultValue={buyer?.start_date ?? ""}
        />
        <TextInput
          label="الميزانية الشهرية (ج.م)"
          name="monthlyBudget"
          type="number"
          min={0}
          defaultValue={buyer?.monthly_budget ?? 0}
        />
      </div>

      <Field label="المنصات المسندة">
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((platform) => (
            <label
              key={platform}
              className="inline-flex items-center gap-2 border border-forest/15 bg-cream/20 px-3 py-2 text-[0.76rem] text-forest"
            >
              <input
                type="checkbox"
                name="platforms"
                value={platform}
                defaultChecked={buyer?.platforms.includes(platform) ?? false}
                className="accent-forest"
              />
              {PLATFORM_LABELS[platform]}
            </label>
          ))}
        </div>
      </Field>

      <TextArea
        label="ملاحظات"
        name="notes"
        defaultValue={buyer?.notes ?? ""}
        placeholder="ملاحظات داخلية عن الأداء أو الاتفاق."
      />

      <label className="inline-flex items-center gap-2 text-[0.78rem] text-forest">
        <input
          type="checkbox"
          name="active"
          defaultChecked={buyer?.active ?? true}
          className="size-4 accent-forest"
        />
        نشط
      </label>

      {error ? <FormMessage>{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-xs bg-forest px-5 text-[0.8rem] text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : buyer ? "حفظ التعديلات" : "إضافة مشترٍ إعلامي"}
        </button>
        {buyer ? (
          <button
            type="button"
            onClick={() => router.push("/admin/marketing/media-buyers")}
            className="inline-flex h-10 items-center rounded-xs border border-forest/25 px-4 text-[0.78rem] text-forest hover:border-forest"
          >
            إلغاء
          </button>
        ) : null}
      </div>
    </form>
  );
}
