"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAdSpendAction } from "@/app/actions/marketing";
import {
  DATA_SOURCES,
  DATA_SOURCE_LABELS,
  type Campaign,
} from "@/lib/marketing-types";
import { FormMessage, SelectField, TextArea, TextInput, humanError } from "@/components/admin/ui";

export function SpendForm({
  campaigns,
  defaultDate,
}: {
  campaigns: Campaign[];
  defaultDate: string;
}) {
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
      const result = await saveAdSpendAction(data);
      if (result.ok) {
        setSuccess("تم حفظ بيانات المصاريف. نفس (الحملة + التاريخ + المصدر) تُحدّث السجل الموجود.");
        form.reset();
        router.refresh();
      } else {
        setError(
          result.error === "future_date"
            ? "لا يمكن إدخال بيانات لتاريخ مستقبلي."
            : result.error === "campaign_not_found"
              ? "الحملة غير موجودة — أنشئها أولًا."
              : humanError(result.error),
        );
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField label="الحملة" name="campaignId" required defaultValue="">
          <option value="" disabled>
            اختر الحملة
          </option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </SelectField>
        <TextInput label="تاريخ التقرير" name="date" type="date" required defaultValue={defaultDate} />
        <TextInput label="المصاريف (ج.م)" name="spend" type="number" min={0} required defaultValue={0} />
        <SelectField label="مصدر البيانات" name="source" defaultValue="manual">
          {DATA_SOURCES.map((source) => (
            <option key={source} value={source}>
              {DATA_SOURCE_LABELS[source]}
            </option>
          ))}
        </SelectField>
        <TextInput label="الظهور (Impressions)" name="impressions" type="number" min={0} />
        <TextInput label="الوصول (Reach)" name="reach" type="number" min={0} />
        <TextInput label="النقرات (Clicks)" name="clicks" type="number" min={0} />
        <TextInput label="زيارات صفحة الهبوط" name="landingPageViews" type="number" min={0} />
        <TextInput label="مشتريات المنصة" name="platformPurchases" type="number" min={0} />
        <TextInput label="إيراد المنصة" name="platformRevenue" type="number" min={0} />
      </div>

      <TextArea
        label="ملاحظات"
        name="notes"
        placeholder="مثال: بيانات مستوردة من تقرير Meta بتاريخ …"
      />

      {error ? <FormMessage>{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}

      <button
        type="submit"
        disabled={pending || campaigns.length === 0}
        className="inline-flex h-10 items-center rounded-xs bg-forest px-5 text-[0.8rem] text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
      >
        {pending ? "جارٍ الحفظ…" : "حفظ بيانات المصاريف"}
      </button>
      {campaigns.length === 0 ? (
        <p className="text-[0.72rem] text-ink-muted">
          أنشئ حملة أولًا لتتمكن من تسجيل المصاريف.
        </p>
      ) : null}
    </form>
  );
}
