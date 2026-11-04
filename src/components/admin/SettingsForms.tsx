"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettingsAction } from "@/app/actions/settings";
import type { Settings, ShippingZone } from "@/lib/settings";
import { MediaPicker } from "./MediaPicker";
import { FormMessage, humanError, inputClass, textareaClass, Toggle, MiniButton } from "./ui";
import { cx } from "@/lib/format";
import type { ComponentProps, ReactNode } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SectionKey = keyof Settings;

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[0.75rem] text-forest">{label}</span>
    {children}
    {hint ? <span className="mt-1 block text-[0.68rem] text-ink-muted">{hint}</span> : null}
  </label>
);

const Text = (props: ComponentProps<"input"> & { label: string; hint?: string }) => {
  const { label, hint, className, ...rest } = props;
  return (
    <Field label={label} hint={hint}>
      <input {...rest} className={cx(inputClass, "text-[0.82rem]", className)} />
    </Field>
  );
};

const Area = (props: ComponentProps<"textarea"> & { label: string; hint?: string }) => {
  const { label, hint, className, ...rest } = props;
  return (
    <Field label={label} hint={hint}>
      <textarea {...rest} rows={3} className={cx(textareaClass, "text-[0.82rem]", className)} />
    </Field>
  );
};

const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center gap-2.5 py-1">
    <Toggle label={label} checked={checked} onChange={onChange} />
    <span className="text-[0.78rem] text-ink-muted">{label}</span>
  </div>
);

/** Generic per-section settings form: local draft → saveSettingsAction. */
export function SettingsForm<K extends SectionKey>({
  section,
  title,
  description,
  initial,
  children,
}: {
  section: K;
  title: string;
  description?: string;
  initial: Settings[K];
  children: (draft: Settings[K], set: (patch: Partial<Settings[K]>) => void) => ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Settings[K]>(() => structuredClone(initial));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<Settings[K]>) => setDraft((prev) => ({ ...prev, ...patch }));

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveSettingsAction(section, draft);
      setMessage(
        result.ok
          ? { ok: true, text: "تم الحفظ — التغيير ظاهر في المتجر فورًا." }
          : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="border border-gold/20 bg-ivory">
      <header className="border-b border-gold/15 bg-cream/30 px-5 py-3.5">
        <h2 className="text-[0.95rem] text-forest">{title}</h2>
        {description ? <p className="mt-0.5 text-[0.72rem] text-ink-muted">{description}</p> : null}
      </header>
      <div className="space-y-4 p-5">{children(draft, set)}</div>
      <footer className="flex flex-wrap items-center gap-3 border-t border-gold/15 bg-cream/20 px-5 py-3.5">
        <MiniButton
          onClick={save}
          disabled={pending}
          className="h-10 border-forest bg-forest px-5 text-ivory hover:bg-forest-deep"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ"}
        </MiniButton>
        {message ? (
          <span className={cx("text-[0.75rem]", message.ok ? "text-forest" : "text-red-900")}>
            {message.text}
          </span>
        ) : null}
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export function StoreSettings({ initial }: { initial: Settings["store"] }) {
  return (
    <SettingsForm section="store" title="بيانات المتجر" description="الاسم بالعربية والإنجليزية، العملة، والشعار." initial={initial}>
      {(draft, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="اسم المتجر (عربي)" value={draft.nameAr} onChange={(e) => set({ nameAr: e.target.value })} />
          <Text
            label="اسم المتجر (إنجليزي)"
            dir="ltr"
            value={draft.nameEn}
            onChange={(e) => set({ nameEn: e.target.value })}
          />
          <Text
            label="رمز العملة"
            dir="ltr"
            hint="مثال: EGP"
            value={draft.currency}
            onChange={(e) => set({ currency: e.target.value })}
          />
          <Text
            label="العملة (عربي)"
            hint="مثال: ج.م"
            value={draft.currencyAr}
            onChange={(e) => set({ currencyAr: e.target.value })}
          />
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-[0.75rem] text-forest">شعار المتجر</span>
            <div className="flex items-center gap-3">
              <MediaPicker
                current={draft.logoPath || undefined}
                onSelect={(path) => set({ logoPath: path })}
                triggerLabel="اختر الشعار"
              />
              {draft.logoPath ? (
                <MiniButton onClick={() => set({ logoPath: "" })}>إزالة (استخدام الشعار الافتراضي)</MiniButton>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </SettingsForm>
  );
}

export function ContactSettings({ initial }: { initial: Settings["contact"] }) {
  return (
    <SettingsForm section="contact" title="بيانات التواصل" description="واتساب، هاتف، بريد، عنوان، وحسابات التواصل." initial={initial}>
      {(draft, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Text
            label="رقم واتساب"
            dir="ltr"
            hint="بدون + : مثل 201001234567"
            value={draft.whatsappNumber}
            onChange={(e) => set({ whatsappNumber: e.target.value })}
          />
          <Text
            label="رقم الهاتف (معروض)"
            dir="ltr"
            value={draft.phoneDisplay}
            onChange={(e) => set({ phoneDisplay: e.target.value })}
          />
          <Text
            label="البريد الإلكتروني"
            dir="ltr"
            type="email"
            value={draft.email}
            onChange={(e) => set({ email: e.target.value })}
          />
          <Text label="العنوان" value={draft.addressAr} onChange={(e) => set({ addressAr: e.target.value })} />
          <Text
            label="إنستجرام"
            dir="ltr"
            hint="رابط الحساب الكامل"
            value={draft.instagram}
            onChange={(e) => set({ instagram: e.target.value })}
          />
          <Text
            label="فيسبوك"
            dir="ltr"
            hint="رابط الحساب الكامل"
            value={draft.facebook}
            onChange={(e) => set({ facebook: e.target.value })}
          />
          <Text
            label="تيك توك"
            dir="ltr"
            hint="رابط الحساب الكامل"
            value={draft.tiktok}
            onChange={(e) => set({ tiktok: e.target.value })}
          />
        </div>
      )}
    </SettingsForm>
  );
}

export function ShippingSettings({ initial }: { initial: Settings["shipping"] }) {
  const [zoneDraft, setZoneDraft] = useState<string | null>(null);
  const [zoneKey, setZoneKey] = useState("");
  const [zone, setZone] = useState<ShippingZone>({ ar: "", en: "", fee: 0, days: "" });

  return (
    <SettingsForm
      section="shipping"
      title="الشحن والمنتجات المجانية"
      description="رسوم كل محافظة، الشحن المجاني، حد الجملة، ورسوم COD."
      initial={initial}
    >
      {(draft, set) => {
        const zones = Object.entries(draft.zones);
        const saveZone = () => {
          const key = zoneKey.trim().toLowerCase().replace(/\s+/g, "_");
          if (!key || !zone.ar) return;
          set({ zones: { ...draft.zones, [key]: zone } });
          setZoneDraft(null);
          setZoneKey("");
          setZone({ ar: "", en: "", fee: 0, days: "" });
        };
        const removeZone = (key: string) => {
          const copy = { ...draft.zones };
          delete copy[key];
          set({ zones: copy });
        };

        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Text
                label="رسوم الشحن الافتراضية"
                type="number"
                dir="ltr"
                hint="للمناطق غير المحددة (بالجنيه)"
                value={draft.defaultFee}
                onChange={(e) => set({ defaultFee: Number(e.target.value) })}
              />
              <Text
                label="حد الشحن المجاني"
                type="number"
                dir="ltr"
                hint="اترك فارغًا (0) لتعطيله"
                value={draft.freeThreshold ?? 0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  set({ freeThreshold: n > 0 ? n : null });
                }}
              />
              <Text
                label="حد الجملة (عدد زجاجات)"
                type="number"
                dir="ltr"
                hint="الطلبات التي تصل لهذا العدد تُشحن مجانًا"
                value={draft.wholesaleMinQty}
                onChange={(e) => set({ wholesaleMinQty: Number(e.target.value) })}
              />
              <Text
                label="رسوم الدفع عند الاستلام"
                type="number"
                dir="ltr"
                hint="0 = بدون رسوم إضافية"
                value={draft.codFee}
                onChange={(e) => set({ codFee: Number(e.target.value) })}
              />
              <Area
                label="ملاحظات الشحن (عربي)"
                value={draft.notesAr}
                onChange={(e) => set({ notesAr: e.target.value })}
                className="sm:col-span-2"
              />
              <Area
                label="Shipping notes (English)"
                dir="ltr"
                value={draft.notesEn}
                onChange={(e) => set({ notesEn: e.target.value })}
                className="sm:col-span-2"
              />
            </div>

            {/* Zones table */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[0.82rem] text-forest">رسوم المحافظات ({zones.length})</h3>
                <MiniButton
                  onClick={() => setZoneDraft(zoneDraft === "new" ? null : "new")}
                  className="h-8"
                >
                  {zoneDraft === "new" ? "إلغاء" : "+ إضافة محافظة"}
                </MiniButton>
              </div>

              {zoneDraft === "new" ? (
                <div className="mb-3 grid gap-3 border border-forest/25 bg-cream/30 p-3 sm:grid-cols-5">
                  <Text
                    label="المعرّف (إنجليزي)"
                    dir="ltr"
                    placeholder="mansoura"
                    value={zoneKey}
                    onChange={(e) => setZoneKey(e.target.value)}
                  />
                  <Text label="الاسم (عربي)" value={zone.ar} onChange={(e) => setZone({ ...zone, ar: e.target.value })} />
                  <Text
                    label="Name (EN)"
                    dir="ltr"
                    value={zone.en}
                    onChange={(e) => setZone({ ...zone, en: e.target.value })}
                  />
                  <Text
                    label="الرسوم"
                    type="number"
                    dir="ltr"
                    value={zone.fee}
                    onChange={(e) => setZone({ ...zone, fee: Number(e.target.value) })}
                  />
                  <Text
                    label="المدة"
                    placeholder="٢-٣ أيام"
                    value={zone.days}
                    onChange={(e) => setZone({ ...zone, days: e.target.value })}
                  />
                  <div className="sm:col-span-5">
                    <MiniButton
                      onClick={saveZone}
                      className="h-9 border-forest bg-forest px-4 text-ivory hover:bg-forest-deep"
                    >
                      إضافة المحافظة
                    </MiniButton>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto border border-gold/20">
                <table className="w-full min-w-[560px] border-collapse text-[0.78rem]">
                  <thead className="bg-forest text-ivory">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">المعرّف</th>
                      <th className="px-3 py-2 text-start font-medium">المحافظة</th>
                      <th className="px-3 py-2 text-start font-medium">الرسوم</th>
                      <th className="px-3 py-2 text-start font-medium">المدة</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/12 bg-ivory">
                    {zones.map(([key, z]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 font-mono text-[0.7rem] text-forest" dir="ltr">
                          {key}
                        </td>
                        <td className="px-3 py-2">
                          {z.ar} <span className="text-ink-muted" dir="ltr">/ {z.en}</span>
                        </td>
                        <td className="tnum px-3 py-2 text-forest">{z.fee}</td>
                        <td className="px-3 py-2 text-ink-muted">{z.days}</td>
                        <td className="px-3 py-2 text-end">
                          <MiniButton
                            onClick={() => removeZone(key)}
                            className="border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory"
                          >
                            حذف
                          </MiniButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 text-[0.68rem] text-ink-muted">
                حذف محافظة يعني أن طلبها سيُرفض عند إتمام الطلب — عدّل الرسوم بدل الحذف إن أمكن.
              </p>
            </div>

            {/* Free cities */}
            <div>
              <h3 className="mb-2 text-[0.82rem] text-forest">مدن الشحن المجاني (بالاسم)</h3>
              <FreeCityList
                values={draft.freeCityNames}
                onChange={(values) => set({ freeCityNames: values })}
              />
            </div>
          </div>
        );
      }}
    </SettingsForm>
  );
}

function FreeCityList({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [next, setNext] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {values.map((city, i) => (
          <span
            key={`${city}-${i}`}
            className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-cream/40 px-3 py-1 text-[0.74rem] text-forest"
          >
            {city}
            <button
              type="button"
              aria-label={`إزالة ${city}`}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-red-900 hover:text-red-700"
            >
              ×
            </button>
          </span>
        ))}
        {values.length === 0 ? <span className="text-[0.74rem] text-ink-muted">لا مدن محددة.</span> : null}
      </div>
      <div className="flex gap-2">
        <input
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="اسم المدينة"
          className={cx(inputClass, "h-10 max-w-56 text-[0.8rem]")}
        />
        <MiniButton
          onClick={() => {
            const v = next.trim();
            if (v && !values.includes(v)) onChange([...values, v]);
            setNext("");
          }}
          className="h-10"
        >
          إضافة
        </MiniButton>
      </div>
    </div>
  );
}

export function TaxSettings({ initial }: { initial: Settings["tax"] }) {
  return (
    <SettingsForm section="tax" title="الضريبة" description="مفعّلة افتراضيًا مع الأسعار الحالية (شاملة)." initial={initial}>
      {(draft, set) => (
        <div className="space-y-4">
          <Check label="تفعيل الضريبة" checked={draft.enabled} onChange={(v) => set({ enabled: v })} />
          <Check
            label="الضريبة مشمولة بالسعر المعروض"
            checked={draft.includedInPrice}
            onChange={(v) => set({ includedInPrice: v })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Text
              label="نسبة الضريبة %"
              type="number"
              dir="ltr"
              min={0}
              max={100}
              step="0.5"
              value={draft.ratePercent}
              onChange={(e) => set({ ratePercent: Number(e.target.value) })}
            />
          </div>
          <Area label="ملاحظة الضريبة (عربي)" value={draft.noteAr} onChange={(e) => set({ noteAr: e.target.value })} />
          <Area
            label="Tax note (English)"
            dir="ltr"
            value={draft.noteEn}
            onChange={(e) => set({ noteEn: e.target.value })}
          />
        </div>
      )}
    </SettingsForm>
  );
}

export function SeoSettings({ initial }: { initial: Settings["seo"] }) {
  return (
    <SettingsForm section="seo" title="SEO ومحركات البحث" description="عنوان ووصف يظهران في نتائج جوجل ومشاركة الروابط." initial={initial}>
      {(draft, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="عنوان الصفحة (عربي)" value={draft.titleAr} onChange={(e) => set({ titleAr: e.target.value })} />
          <Text
            label="Page title (English)"
            dir="ltr"
            value={draft.titleEn}
            onChange={(e) => set({ titleEn: e.target.value })}
          />
          <Area
            label="وصف الصفحة (عربي)"
            value={draft.descriptionAr}
            onChange={(e) => set({ descriptionAr: e.target.value })}
            className="sm:col-span-2"
          />
          <Area
            label="Page description (English)"
            dir="ltr"
            value={draft.descriptionEn}
            onChange={(e) => set({ descriptionEn: e.target.value })}
            className="sm:col-span-2"
          />
        </div>
      )}
    </SettingsForm>
  );
}

export function PaymentSettings({ initial }: { initial: Settings["payments"] }) {
  return (
    <SettingsForm section="payments" title="طرق الدفع" description="الدفع عند الاستلام مفعّل دائمًا — هنا تُضبط إنستاباي." initial={initial}>
      {(draft, set) => (
        <div className="space-y-4">
          <Check
            label="تفعيل الدفع عبر إنستاباي"
            checked={draft.instapayEnabled}
            onChange={(v) => set({ instapayEnabled: v })}
          />
          <Text
            label="حساب إنستاباي"
            dir="ltr"
            hint="رقم الموبايل أو الإيميل المستلم للمبالغ"
            value={draft.instapayHandle}
            onChange={(e) => set({ instapayHandle: e.target.value })}
          />
          <p className="border border-gold/20 bg-cream/25 p-3 text-[0.74rem] leading-6 text-ink-muted">
            الدفع عند الاستلام (COD) يعمل دائمًا — إعدادات الشحن أعلاه تحدد رسومه.
          </p>
        </div>
      )}
    </SettingsForm>
  );
}

export function FlagsSettings({ initial }: { initial: Settings["flags"] }) {
  return (
    <SettingsForm section="flags" title="خيارات المتجر" description="عوامل تشغيل عامة." initial={initial}>
      {(draft, set) => (
        <div className="space-y-3">
          <Check
            label="إظهار تنبيه «بيانات تجريبية» في المتجر"
            checked={draft.sampleCatalog}
            onChange={(v) => set({ sampleCatalog: v })}
          />
          <p className="text-[0.74rem] leading-6 text-ink-muted">
            أطفئ هذا الخيار بعد إدخال أسعارك ومخزونك الحقيقيين.
          </p>
        </div>
      )}
    </SettingsForm>
  );
}

export function AnnouncementSettings({ initial }: { initial: Settings["announcements"] }) {
  return (
    <SettingsForm
      section="announcements"
      title="الشريط الإعلاني"
      description="رسائل متغيرة أعلى الموقع (بالعربية والإنجليزية)."
      initial={initial}
    >
      {(draft, set) => (
        <div className="grid gap-5 sm:grid-cols-2">
          <StringList label="رسائل عربية" values={draft.ar} onChange={(ar) => set({ ar })} />
          <StringList label="English messages" values={draft.en} onChange={(en) => set({ en })} />
        </div>
      )}
    </SettingsForm>
  );
}

function StringList({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [next, setNext] = useState("");
  return (
    <div className="space-y-2">
      <span className="mb-1 block text-[0.75rem] text-forest">{label}</span>
      <ul className="space-y-2">
        {values.map((v, i) => (
          <li key={i} className="flex gap-2">
            <input
              value={v}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
              className={cx(inputClass, "h-10 text-[0.8rem]")}
            />
            <MiniButton
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="h-10 shrink-0 border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory"
            >
              ×
            </MiniButton>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="رسالة جديدة…"
          className={cx(inputClass, "h-10 text-[0.8rem]")}
        />
        <MiniButton
          onClick={() => {
            const v = next.trim();
            if (v && values.length < 10) onChange([...values, v]);
            setNext("");
          }}
          className="h-10 shrink-0"
        >
          إضافة
        </MiniButton>
      </div>
      <p className="text-[0.68rem] text-ink-muted">حتى 10 رسائل تتناوب تلقائيًا.</p>
    </div>
  );
}
