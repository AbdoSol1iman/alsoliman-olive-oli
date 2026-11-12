"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCampaignAction } from "@/app/actions/marketing";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  type Campaign,
  type MediaBuyer,
} from "@/lib/marketing-types";
import { FormMessage, SelectField, TextArea, TextInput, humanError } from "@/components/admin/ui";

export function CampaignForm({
  campaign,
  buyers,
  products,
}: {
  campaign?: Campaign;
  buyers: MediaBuyer[];
  products: { id: string; name: string }[];
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
      const result = await saveCampaignAction(data);
      if (result.ok) {
        setSuccess(campaign ? "تم تحديث الحملة." : "تم إنشاء الحملة.");
        if (campaign) {
          router.push("/admin/marketing/campaigns");
        } else {
          form.reset();
        }
      } else {
        setError(
          result.error === "utm_taken"
            ? "قيمة utm_campaign مستخدمة في حملة أخرى. اختر قيمة فريدة لربط الطلبات بشكل صحيح."
            : humanError(result.error),
        );
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {campaign ? <input type="hidden" name="id" value={campaign.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="اسم الحملة"
          name="name"
          required
          defaultValue={campaign?.name ?? ""}
          placeholder="مثال: رمضان — زيت زيتون 750 مل"
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="المنصة" name="platform" defaultValue={campaign?.platform ?? "meta"}>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </option>
            ))}
          </SelectField>
          <SelectField label="الحالة" name="status" defaultValue={campaign?.status ?? "active"}>
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CAMPAIGN_STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
        </div>
        <TextInput
          label="قيمة utm_campaign"
          name="utmCampaign"
          defaultValue={campaign?.utm_campaign ?? ""}
          placeholder="ramadan_750"
          dir="ltr"
          hint="نفس القيمة الموجودة في رابط الإعلان — هي مفتاح ربط الطلبات بالحملة."
        />
        <TextInput
          label="صفحة الهبوط"
          name="landingPage"
          defaultValue={campaign?.landing_page ?? ""}
          placeholder="/ar/product/extra-virgin-olive-oil"
          dir="ltr"
        />
        <SelectField
          label="المشتري الإعلامي"
          name="mediaBuyerId"
          defaultValue={campaign?.media_buyer_id ?? ""}
        >
          <option value="">بدون إسناد</option>
          {buyers.map((buyer) => (
            <option key={buyer.id} value={buyer.id}>
              {buyer.full_name}
              {buyer.active ? "" : " (غير نشط)"}
            </option>
          ))}
        </SelectField>
        <SelectField label="المنتج المرتبط" name="productId" defaultValue={campaign?.product_id ?? ""}>
          <option value="">بدون ربط منتج</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </SelectField>
      </div>

      <TextArea
        label="ملاحظات"
        name="notes"
        defaultValue={campaign?.notes ?? ""}
        placeholder="الجمهور، الميزانية، الملاحظات الإبداعية…"
      />

      {error ? <FormMessage>{error}</FormMessage> : null}
      {success ? <FormMessage tone="success">{success}</FormMessage> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-xs bg-forest px-5 text-[0.8rem] text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : campaign ? "حفظ التعديلات" : "إضافة الحملة"}
        </button>
        {campaign ? (
          <button
            type="button"
            onClick={() => router.push("/admin/marketing/campaigns")}
            className="inline-flex h-10 items-center rounded-xs border border-forest/25 px-4 text-[0.78rem] text-forest hover:border-forest"
          >
            إلغاء
          </button>
        ) : null}
      </div>
    </form>
  );
}
