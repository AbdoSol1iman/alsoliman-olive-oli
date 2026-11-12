"use client";

import { useMemo, useState, useTransition } from "react";
import { saveContentAction, saveMediaImageAction } from "@/app/actions/settings";
import { MediaPicker } from "./MediaPicker";
import { FormMessage, MiniButton, humanError, inputClass, textareaClass, Toggle } from "./ui";
import { cx } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

/** Arabic labels for known dictionary keys; falls back to a humanised key. */
const LABELS: Record<string, string> = {
  eyebrow: "نص صغير علوي",
  title: "العنوان",
  titleTop: "العنوان (أعلى)",
  titleBottom: "العنوان (أسفل)",
  body: "النص",
  ctaPrimary: "زر رئيسي",
  ctaSecondary: "زر ثانوي",
  cta: "زر الإجراء",
  caption: "تعليق الصورة",
  imageCaption: "تعليق الصورة",
  sealTop: "ختم (أعلى)",
  sealBottom: "ختم (أسفل)",
  scroll: "نص التمرير",
  marks: "نقاط مميزة",
  all: "زر «كل المنتجات»",
  quote: "اقتباس",
  signature: "التوقيع",
  items: "العناصر",
  cards: "البطاقات",
  note: "ملاحظة",
  empty: "حالة فارغة",
  question: "السؤال",
  answer: "الإجابة",
  image: "الصورة",
  href: "الرابط",
  subtitle: "عنوان فرعي",
  hasDropdown: "إتاحة قائمة منسدلة للأحجام على البطاقة",
  productIds: "المنتجات المشمولة في العرض (تجميع منتج أو أكثر)",
  productId: "المنتج المرتبط (اختياري)",
  compareAt: "السعر قبل الخصم (ج.م)",
  price: "سعر العرض (ج.م) — اختياري",
  enabled: "مفعّل",
  sections: "الأقسام",
  blurb: "وصف مختصر",
  intro: "مقدمة",
  disclaimer: "تنويه",
  placeholder: "نص الحقل",
  hoursValue: "قيمة أوقات العمل",
  defaultMessage: "الرسالة الافتراضية",
  heroImage: "صورة الواجهة",
  storyImage: "صورة القصة",
  whyImage: "صورة قسم المزايا",
};

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();

const labelFor = (key: string) => LABELS[key] ?? humanize(key);

/** Immutable deep update used by the recursive field editor. */
function deepSet(obj: Json, path: (string | number)[], value: Json): Json {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[head as number] = deepSet(copy[head as number], rest, value);
    return copy;
  }
  const source = (obj && typeof obj === "object" ? obj : {}) as Record<string, Json>;
  return { ...source, [head as string]: deepSet(source[head as string], rest, value) };
}

const isImageKey = (key: string) => key === "image" || key.endsWith("Image");
const isLongText = (value: string) => value.length > 90 || value.includes("\n");

/** Template for adding a new item to an array (object rows use the first item's shape). */
const emptyItem = (sample: Json): Json => {
  if (sample && typeof sample === "object" && !Array.isArray(sample)) {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(sample)) {
      out[k] = typeof v === "string" ? "" : typeof v === "number" ? 0 : typeof v === "boolean" ? v : [];
    }
    return out;
  }
  return "";
};

export type AdminProduct = {
  id: string;
  nameAr: string;
  nameEn: string;
  variants?: Array<{
    id: string;
    sizeLabelAr: string;
    sizeLabelEn: string;
    price: number;
    stock: number | null;
  }>;
};

type VariantOption = {
  id: string;
  productId: string;
  label: string;
  price: number;
};

function ProductCombiner({
  value,
  onChange,
  products,
}: {
  value: Json;
  onChange: (val: string[]) => void;
  products?: AdminProduct[];
}) {
  const options = useMemo<VariantOption[]>(() => {
    if (!products || products.length === 0) return [];
    const list: VariantOption[] = [];
    for (const p of products) {
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          list.push({
            id: v.id,
            productId: p.id,
            label: `${p.nameAr} — ${v.sizeLabelAr}`,
            price: v.price,
          });
        }
      } else {
        list.push({
          id: p.id,
          productId: p.id,
          label: p.nameAr,
          price: 0,
        });
      }
    }
    return list;
  }, [products]);

  const rawArray = Array.isArray(value)
    ? (value as string[])
    : typeof value === "string" && value
      ? [value]
      : [];

  const counts: Record<string, number> = {};
  for (const item of rawArray) {
    if (typeof item === "string" && item.trim()) {
      counts[item] = (counts[item] || 0) + 1;
    }
  }

  const totalAmount = options.reduce((sum: number, opt: VariantOption) => {
    const c = counts[opt.id] || 0;
    return sum + opt.price * c;
  }, 0);

  const totalUnits = Object.values(counts).reduce((a, b) => a + b, 0);

  const updateCount = (id: string, newCount: number) => {
    const nextCounts = { ...counts };
    if (newCount <= 0) {
      delete nextCounts[id];
    } else {
      nextCounts[id] = newCount;
    }
    const newArray: string[] = [];
    for (const [vId, c] of Object.entries(nextCounts)) {
      for (let i = 0; i < c; i++) {
        newArray.push(vId);
      }
    }
    onChange(newArray);
  };

  return (
    <div className="rounded-xs border border-gold/30 bg-cream/25 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 pb-2">
        <span className="text-[0.75rem] font-medium text-forest">
          المنتجات المشمولة في العرض (تجميع منتج أو أكثر)
        </span>
        {totalUnits > 0 ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-xs bg-forest px-2 py-0.5 text-[0.7rem] font-medium text-ivory">
              المجموع المحسوب: {totalAmount} ج.م ({totalUnits} قطع)
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[0.68rem] text-red-800 hover:underline cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>
        ) : (
          <span className="text-[0.68rem] text-ink-muted">لم يتم تحديد منتجات بعد</span>
        )}
      </div>

      {options.length === 0 ? (
        <p className="text-[0.72rem] text-ink-muted">لا توجد منتجات مسجلة في المتجر.</p>
      ) : (
        <div className="space-y-2">
          {options.map((opt: VariantOption) => {
            const count = counts[opt.id] || 0;
            const isSelected = count > 0;
            return (
              <div
                key={opt.id}
                className={cx(
                  "flex items-center justify-between gap-3 rounded-xs border p-2.5 transition-colors text-sm",
                  isSelected
                    ? "border-forest/50 bg-ivory shadow-2xs"
                    : "border-gold/20 bg-ivory/60 hover:border-gold/40 hover:bg-ivory",
                )}
              >
                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 select-none">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => updateCount(opt.id, e.target.checked ? 1 : 0)}
                    className="size-4 accent-forest cursor-pointer rounded-xs"
                  />
                  <span className="font-medium text-forest text-[0.82rem] truncate">{opt.label}</span>
                  <span className="text-[0.75rem] text-gold font-medium">({opt.price} ج.م)</span>
                </label>

                {isSelected ? (
                  <div className="flex items-center gap-1.5 bg-cream/40 border border-gold/30 rounded-xs px-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => updateCount(opt.id, count - 1)}
                      className="size-5 flex items-center justify-center text-forest hover:bg-forest/15 rounded-xs text-xs font-bold transition-colors cursor-pointer"
                      title="إنقاص الكمية"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-xs font-semibold text-forest">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCount(opt.id, count + 1)}
                      className="size-5 flex items-center justify-center text-forest hover:bg-forest/15 rounded-xs text-xs font-bold transition-colors cursor-pointer"
                      title="زيادة الكمية"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateCount(opt.id, 1)}
                    className="rounded-xs border border-gold/30 bg-ivory px-2 py-0.5 text-[0.7rem] text-forest hover:border-forest transition-colors cursor-pointer"
                  >
                    + إضافة
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[0.68rem] leading-5 text-ink-muted">
        💡 عند نقر المشتري على زر «أضف للسلة» في هذا العرض، ستتم إضافة جميع المنتجات المحددة أعلاه تلقائياً إلى السلة بأسعارها المجمعة.
      </p>
    </div>
  );
}

/** Recursive renderer: one control per leaf, cards for object arrays. */
function Fields({
  value,
  path,
  onChange,
  newItem,
  products,
}: {
  value: Json;
  path: (string | number)[];
  onChange: (path: (string | number)[], value: Json) => void;
  /** Shape used when adding the first row of an empty object array. */
  newItem?: Json;
  products?: AdminProduct[];
}) {
  if (value === null || value === undefined) return null;

  const key = String(path[path.length - 1] ?? "");

  if (key === "productIds") {
    return (
      <ProductCombiner
        value={value}
        onChange={(val) => onChange(path, val)}
        products={products}
      />
    );
  }

  if (key === "compareAt") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] text-forest">{labelFor(key)}</span>
        <div className="relative">
          <input
            type="number"
            min={0}
            placeholder="مثال: 750 (اتركه فارغاً إن لم يكن هناك خصم)"
            value={value !== null && value !== undefined && value !== "" ? String(value) : ""}
            onChange={(e) =>
              onChange(path, e.target.value === "" ? "" : Number(e.target.value))
            }
            className={cx(inputClass, "pe-10")}
          />
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[0.72rem] text-ink-muted">
            ج.م
          </span>
        </div>
        <p className="mt-1 text-[0.68rem] text-ink-muted">
          السعر قبل الخصم: يظهر مشطوباً بجانب سعر العرض في الموقع لإبراز قيمة التوفير للمشتري.
        </p>
      </label>
    );
  }

  if (key === "price") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] text-forest">{labelFor(key)}</span>
        <div className="relative">
          <input
            type="number"
            min={0}
            placeholder="فارغ = استخدام المجموع المحسوب للمنتجات المحددة تلقائياً"
            value={value !== null && value !== undefined && value !== "" ? String(value) : ""}
            onChange={(e) =>
              onChange(path, e.target.value === "" ? "" : Number(e.target.value))
            }
            className={cx(inputClass, "pe-10")}
          />
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[0.72rem] text-ink-muted">
            ج.م
          </span>
        </div>
        <p className="mt-1 text-[0.68rem] text-ink-muted">
          سعر العرض بعد الخصم — إذا تُرك فارغاً، سيتم احتساب مجموع أسعار المنتجات المحددة في العرض تلقائياً.
        </p>
      </label>
    );
  }

  if (typeof value === "string") {
    if (key === "productId" && products && products.length > 0) {
      return (
        <label className="block">
          <span className="mb-1.5 block text-[0.75rem] text-forest">{labelFor(key)}</span>
          <select
            value={value || ""}
            onChange={(e) => onChange(path, e.target.value)}
            className={cx(inputClass, "appearance-none pe-8 cursor-pointer")}
          >
            <option value="">جميع المنتجات والأحجام (تلقائي)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr} ({p.id})
              </option>
            ))}
          </select>
          <p className="mt-1 text-[0.68rem] text-ink-muted">
            (إذا حددت منتجات في قسم التجميع أعلاه، فستكون لها الأولوية)
          </p>
        </label>
      );
    }
    if (isImageKey(key)) {
      return (
        <div>
          <span className="mb-1.5 block text-[0.75rem] text-forest">{labelFor(key)}</span>
          <MediaPicker
            current={value || undefined}
            onSelect={(p) => onChange(path, p)}
            triggerLabel="اختر صورة"
            onClear={() => onChange(path, "")}
          />
          {!value && key.endsWith("Image") ? (
            <p className="mt-1.5 text-[0.68rem] text-ink-muted">
              بدون صورة مخصّصة — يظهر الشكل الافتراضي للقسم.
            </p>
          ) : null}
        </div>
      );
    }
    return (
      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] text-forest">{labelFor(key)}</span>
        {isLongText(value) ? (
          <textarea
            rows={3}
            value={value}
            onChange={(e) => onChange(path, e.target.value)}
            className={textareaClass}
          />
        ) : (
          <input value={value} onChange={(e) => onChange(path, e.target.value)} className={inputClass} />
        )}
      </label>
    );
  }

  if (typeof value === "number") {
    const key = String(path[path.length - 1] ?? "");
    return (
      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] text-forest">{labelFor(key)}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(path, Number(e.target.value))}
          className={inputClass}
        />
      </label>
    );
  }

  if (typeof value === "boolean") {
    const key = String(path[path.length - 1] ?? "");
    return (
      <div className="flex items-center gap-2.5">
        <Toggle label={labelFor(key)} checked={value} onChange={(v) => onChange(path, v)} />
        <span className="text-[0.78rem] text-ink-muted">{labelFor(key)}</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const key = String(path[path.length - 1] ?? "القائمة");
    const objectRows = value.length > 0 && typeof value[0] === "object" && value[0] !== null && !Array.isArray(value[0]);
    const addsObject = objectRows || (value.length === 0 && newItem !== undefined);
    const itemLabel = key === "items" || key === "cards" ? "بطاقة" : addsObject ? "عنصر" : "بند";
    return (
      <fieldset className="border border-gold/20 bg-cream/20 p-3.5">
        <legend className="px-1.5 text-[0.75rem] text-forest">
          {labelFor(key)} <span className="text-ink-muted">({value.length})</span>
        </legend>
        <div className="space-y-3">
          {value.map((item, i) => (
            <div key={i} className={cx(objectRows && "border border-gold/15 bg-ivory p-3")}>
              {objectRows ? (
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[0.66rem] tracking-[0.16em] text-gold">{itemLabel} {i + 1}</span>
                  <MiniButton
                    onClick={() => onChange(path, value.filter((_: Json, j: number) => j !== i))}
                    className="border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory"
                  >
                    حذف
                  </MiniButton>
                </div>
              ) : null}
              {objectRows ? (
                <Fields value={item} path={[...path, i]} onChange={onChange} newItem={newItem} products={products} />
              ) : typeof item === "string" ? (
                <div className="flex items-start gap-2">
                  {isLongText(item) ? (
                    <textarea
                      rows={2}
                      value={item}
                      onChange={(e) => onChange([...path, i], e.target.value)}
                      className={textareaClass}
                    />
                  ) : (
                    <input
                      value={item}
                      onChange={(e) => onChange([...path, i], e.target.value)}
                      className={inputClass}
                    />
                  )}
                  <MiniButton
                    onClick={() => onChange(path, value.filter((_: Json, j: number) => j !== i))}
                    className="mt-1 shrink-0 border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory"
                  >
                    ×
                  </MiniButton>
                </div>
              ) : (
                <Fields value={item} path={[...path, i]} onChange={onChange} newItem={newItem} products={products} />
              )}
            </div>
          ))}
          <MiniButton
            onClick={() => onChange(path, [...value, emptyItem(value[0] ?? newItem)])}
            className="border-forest/40"
          >
            + إضافة {itemLabel}
          </MiniButton>
        </div>
      </fieldset>
    );
  }

  if (typeof value === "object") {
    const merged =
      newItem && typeof newItem === "object" && !Array.isArray(newItem)
        ? { ...newItem, ...(value as Record<string, Json>) }
        : (value as Record<string, Json>);

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(merged).map(([k, v]) => (
          <Fields key={k} value={v} path={[...path, k]} onChange={onChange} newItem={newItem} products={products} />
        ))}
      </div>
    );
  }

  return null;
}

export type EditorSection = {
  key: string;
  title: string;
  description?: string;
  initial: Json;
  /** false = plain object (e.g. media), true = { ar, en } overlays */
  bilingual?: boolean;
  /**
   * Optional image that lives in `content:media` but is edited in this tab
   * (the story tab owns `media.storyImage`). It is saved with the section.
   */
  mediaImage?: {
    field: "heroImage" | "storyImage" | "whyImage";
    label: string;
    value: string;
    hint?: string;
  };
  /** Shape for the first row when an object array starts empty. */
  itemTemplate?: Json;
  /** Shape for the first row when an object array starts empty (per locale). */
  itemTemplates?: { ar: Json; en: Json };
};

/**
 * Tabbed editor for one or more content sections. Each tab edits one section
 * in place; saving writes the whole section overlay and revalidates the
 * storefront immediately (no redeploy).
 */
export function ContentSections({
  sections,
  products,
}: {
  sections: EditorSection[];
  products?: AdminProduct[];
}) {
  const [activeKey, setActiveKey] = useState(sections[0]?.key ?? "");
  const active = sections.find((s) => s.key === activeKey) ?? sections[0];

  const [values, setValues] = useState<Record<string, Json>>(() =>
    Object.fromEntries(sections.map((s) => [s.key, structuredClone(s.initial)])),
  );
  const [locale, setLocale] = useState<"ar" | "en">("ar");
  const [mediaImages, setMediaImages] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      sections.filter((s) => s.mediaImage).map((s) => [s.key, s.mediaImage!.value]),
    ),
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!active) return null;

  const bilingual = active.bilingual !== false;
  const currentValue = values[active.key];

  const change = (path: (string | number)[], value: Json) =>
    setValues((prev) => ({ ...prev, [active.key]: deepSet(prev[active.key], path, value) }));

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveContentAction(active.key, currentValue);
      if (!result.ok) {
        setMessage({ ok: false, text: humanError(result.error) });
        return;
      }
      if (active.mediaImage) {
        const imageResult = await saveMediaImageAction(
          active.mediaImage.field,
          mediaImages[active.key] ?? "",
        );
        if (!imageResult.ok) {
          setMessage({ ok: false, text: humanError(imageResult.error) });
          return;
        }
      }
      setMessage({ ok: true, text: "تم الحفظ — التغيير ظاهر في الموقع فورًا." });
    });
  };

  const reset = () => {
    if (!window.confirm("إرجاع هذا القسم للنص الأصلي؟ ستفقد تعديلاتك المحفوظة فيه.")) return;
    setValues((prev) => ({ ...prev, [active.key]: structuredClone(active.initial) }));
    if (active.mediaImage) {
      const initialImage = active.mediaImage.value;
      setMediaImages((prev) => ({ ...prev, [active.key]: initialImage }));
    }
    setMessage(null);
  };

  const rootPath: (string | number)[] = bilingual ? [locale] : [];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <nav aria-label="أقسام المحتوى" className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setActiveKey(s.key);
              setMessage(null);
            }}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-[0.76rem] transition-colors",
              s.key === active.key
                ? "border-forest bg-forest text-ivory"
                : "border-gold/30 bg-ivory text-ink-muted hover:border-forest/40 hover:text-forest",
            )}
          >
            {s.title}
          </button>
        ))}
      </nav>

      <div className="border border-gold/20 bg-ivory">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/15 bg-cream/30 px-5 py-3.5">
          <div>
            <h2 className="text-[0.95rem] text-forest">{active.title}</h2>
            {active.description ? (
              <p className="mt-0.5 text-[0.72rem] text-ink-muted">{active.description}</p>
            ) : null}
          </div>
          {bilingual ? (
            <div className="flex rounded-xs border border-forest/20 p-0.5">
              {(["ar", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={cx(
                    "rounded-xs px-3 py-1 text-[0.72rem] transition-colors",
                    locale === l ? "bg-forest text-ivory" : "text-ink-muted hover:text-forest",
                  )}
                >
                  {l === "ar" ? "العربية" : "English"}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <div className="p-5">
          {active.mediaImage ? (
            <div className="mb-5 border-b border-gold/15 pb-5">
              <span className="mb-1.5 block text-[0.75rem] text-forest">
                {active.mediaImage.label}
              </span>
              <MediaPicker
                current={mediaImages[active.key] || undefined}
                onSelect={(p) => setMediaImages((prev) => ({ ...prev, [active.key]: p }))}
                onClear={() => setMediaImages((prev) => ({ ...prev, [active.key]: "" }))}
                triggerLabel="اختر صورة"
              />
              {active.mediaImage.hint ? (
                <p className="mt-1.5 text-[0.68rem] text-ink-muted">{active.mediaImage.hint}</p>
              ) : null}
            </div>
          ) : null}
          <Fields
            value={bilingual ? currentValue?.[locale] : currentValue}
            path={rootPath}
            onChange={change}
            newItem={active.itemTemplates?.[locale] ?? active.itemTemplate}
            products={products}
          />
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-gold/15 bg-cream/20 px-5 py-3.5">
          <MiniButton
            onClick={save}
            disabled={pending}
            className="h-10 border-forest bg-forest px-5 text-ivory hover:bg-forest-deep"
          >
            {pending ? "جارٍ الحفظ…" : "حفظ القسم"}
          </MiniButton>
          <MiniButton onClick={reset} className="h-10 px-4">
            إرجاع القيم الأصلية
          </MiniButton>
          {message ? (
            <span className={cx("text-[0.75rem]", message.ok ? "text-forest" : "text-red-900")}>
              {message.text}
            </span>
          ) : (
            <span className="text-[0.7rem] text-ink-muted">
              النصوص تظهر في الموقع مباشرة بعد الحفظ — {locale === "ar" ? "العربية" : "الإنجليزية"}.
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}

/** Standalone single-section editor (used for FAQ, banners, media…). */
export function SectionEditor({ section }: { section: EditorSection }) {
  return <ContentSections sections={[section]} />;
}

export { FormMessage };
