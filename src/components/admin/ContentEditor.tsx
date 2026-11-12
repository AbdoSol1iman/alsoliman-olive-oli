"use client";

import { useState, useTransition } from "react";
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
  hasDropdown: "قائمة منسدلة للأحجام (لتفعيل زر أضف للسلة)",
  productId: "المنتج المرتبط (اختياري)",
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
  products?: { id: string; nameAr: string; nameEn: string }[];
}) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const key = String(path[path.length - 1] ?? "");
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
  products?: { id: string; nameAr: string; nameEn: string }[];
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
