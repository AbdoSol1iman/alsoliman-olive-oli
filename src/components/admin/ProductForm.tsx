"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProductAction } from "@/app/actions/catalog";
import { productInputSchema, type ProductInput } from "@/lib/admin-schemas";
import type { Product, Category } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { MediaPicker } from "./MediaPicker";
import {
  AdminCard,
  ConfirmSubmit,
  Field,
  FormMessage,
  MiniButton,
  SelectField,
  TextArea,
  TextInput,
  Toggle,
  humanError,
  inputClass,
  textareaClass,
} from "./ui";

type VariantDraft = ProductInput["variants"][number];
type ImageDraft = ProductInput["images"][number];
type SpecDraft = ProductInput["specs"][number];

const newVariant = (n: number): VariantDraft => ({
  id: "",
  sizeLabelAr: "",
  sizeLabelEn: "",
  ml: 0,
  price: 0,
  compareAt: null,
  stock: null,
  cost: null,
  sku: "",
});

const emptyDraft = (): ProductInput => ({
  slug: "",
  categoryId: null,
  nameAr: "",
  nameEn: "",
  subtitleAr: "",
  subtitleEn: "",
  hookAr: "",
  hookEn: "",
  descriptionAr: [""],
  descriptionEn: [""],
  storageAr: "",
  storageEn: "",
  badgeAr: null,
  badgeEn: null,
  specs: [],
  active: true,
  featured: false,
  comingSoon: false,
  sample: false,
  sortOrder: 0,
  lowStockThreshold: 5,
  variants: [newVariant(1)],
  images: [],
});

const fromProduct = (p: Product): ProductInput => ({
  slug: p.slug,
  categoryId: p.categoryId,
  nameAr: p.nameAr,
  nameEn: p.nameEn,
  subtitleAr: p.subtitleAr,
  subtitleEn: p.subtitleEn,
  hookAr: p.hookAr,
  hookEn: p.hookEn,
  descriptionAr: p.descriptionAr.length ? p.descriptionAr : [""],
  descriptionEn: p.descriptionEn.length ? p.descriptionEn : [""],
  storageAr: p.storageAr,
  storageEn: p.storageEn,
  badgeAr: p.badgeAr,
  badgeEn: p.badgeEn,
  specs: p.specs,
  active: p.active,
  featured: p.featured,
  comingSoon: p.comingSoon,
  sample: p.sample,
  sortOrder: p.sortOrder,
  lowStockThreshold: p.lowStockThreshold,
  variants: p.variants.map((v) => ({
    id: v.id,
    sizeLabelAr: v.sizeLabelAr,
    sizeLabelEn: v.sizeLabelEn,
    ml: v.ml,
    price: v.price,
    compareAt: v.compareAt,
    stock: v.stock,
    cost: v.cost,
    sku: v.sku,
  })),
  // The editor works with real images only (no synthetic fallback).
  images: p.images
    .filter((i) => i.src !== "/products/bottle-cutout.png" || p.images.length === 1)
    .map((img, i) => ({
      src: img.src,
      altAr: img.altAr,
      altEn: img.altEn,
      isPrimary: i === 0,
    })),
});

const num = (v: string, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

/** Paragraph list editor (descriptions). */
function LinesEditor({
  label,
  lines,
  onChange,
}: {
  label: string;
  lines: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[0.75rem] text-forest">{label}</p>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              value={line}
              rows={2}
              onChange={(e) => {
                const next = [...lines];
                next[i] = e.target.value;
                onChange(next);
              }}
              className={textareaClass}
              placeholder="فقرة…"
            />
            <MiniButton
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
              className="h-auto self-stretch px-2 text-red-900"
              aria-label="حذف الفقرة"
            >
              ✕
            </MiniButton>
          </div>
        ))}
      </div>
      <MiniButton onClick={() => onChange([...lines, ""])} className="mt-2">
        + فقرة
      </MiniButton>
    </div>
  );
}

export function ProductForm({
  product,
  categories,
}: {
  product: Product | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductInput>(() =>
    product ? fromProduct(product) : emptyDraft(),
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addImage = (src: string) =>
    setDraft((d) => ({
      ...d,
      images: [
        ...d.images,
        { src, altAr: d.nameAr, altEn: d.nameEn, isPrimary: d.images.length === 0 },
      ].slice(0, 12),
    }));

  const moveImage = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const images = [...d.images];
      const target = index + dir;
      if (target < 0 || target >= images.length) return d;
      [images[index], images[target]] = [images[target], images[index]];
      return { ...d, images };
    });

  const moveVariant = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      const variants = [...d.variants];
      const target = index + dir;
      if (target < 0 || target >= variants.length) return d;
      [variants[index], variants[target]] = [variants[target], variants[index]];
      return { ...d, variants };
    });

  const setPrimary = (index: number) =>
    setDraft((d) => ({
      ...d,
      images: d.images.map((img, i) => ({ ...img, isPrimary: i === index })),
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError("");
    setFieldErrors({});

    // Normalise empties → null before validation.
    const payload = {
      ...draft,
      badgeAr: draft.badgeAr?.trim() ? draft.badgeAr : null,
      badgeEn: draft.badgeEn?.trim() ? draft.badgeEn : null,
      descriptionAr: draft.descriptionAr.map((s) => s.trim()).filter(Boolean),
      descriptionEn: draft.descriptionEn.map((s) => s.trim()).filter(Boolean),
      variants: draft.variants.map((v) => ({
        ...v,
        compareAt: v.compareAt !== null && v.compareAt > 0 ? v.compareAt : null,
        stock: v.stock !== null && v.stock >= 0 ? v.stock : null,
      })),
      images: draft.images.map((img) => ({ ...img, altAr: img.altAr || draft.nameAr, altEn: img.altEn || draft.nameEn })),
    };

    const parsed = productInputSchema.safeParse(payload);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!map[key]) map[key] = issue.message;
      }
      setFieldErrors(map);
      setError("راجع الحقول المميزة بالأحمر.");
      return;
    }

    startTransition(async () => {
      const result = await saveProductAction(product?.id ?? null, parsed.data);
      if (!result.ok) {
        setError(humanError(result.error));
        return;
      }
      router.push("/admin/products");
    });
  };

  const err = (key: string) => fieldErrors[key] ?? null;

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? <FormMessage>{error}</FormMessage> : null}

      {/* basics */}
      <AdminCard title="البيانات الأساسية">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="الاسم (عربي)"
            name="nameAr"
            required
            value={draft.nameAr}
            onChange={(e) => set("nameAr", e.target.value)}
            error={err("nameAr")}
          />
          <TextInput
            label="الاسم (إنجليزي)"
            name="nameEn"
            dir="ltr"
            required
            value={draft.nameEn}
            onChange={(e) => set("nameEn", e.target.value)}
            error={err("nameEn")}
          />
          <TextInput
            label="الرابط (slug)"
            name="slug"
            dir="ltr"
            required
            placeholder="extra-virgin-olive-oil"
            hint="حروف صغيرة وأرقام وشرطات فقط — يظهر في رابط المنتج."
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value)}
            error={err("slug")}
          />
          <SelectField
            label="التصنيف"
            name="categoryId"
            value={draft.categoryId ?? ""}
            onChange={(e) => set("categoryId", e.target.value || null)}
          >
            <option value="">بدون تصنيف</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </SelectField>
          <TextInput
            label="العنوان الفرعي (عربي)"
            name="subtitleAr"
            value={draft.subtitleAr}
            onChange={(e) => set("subtitleAr", e.target.value)}
          />
          <TextInput
            label="العنوان الفرعي (إنجليزي)"
            name="subtitleEn"
            dir="ltr"
            value={draft.subtitleEn}
            onChange={(e) => set("subtitleEn", e.target.value)}
          />
          <TextInput
            label="سطر تعريفي (عربي)"
            name="hookAr"
            hint="جملة تسويقية قصيرة تظهر في وصف المنتج ونتائج البحث."
            value={draft.hookAr}
            onChange={(e) => set("hookAr", e.target.value)}
          />
          <TextInput
            label="سطر تعريفي (إنجليزي)"
            name="hookEn"
            dir="ltr"
            value={draft.hookEn}
            onChange={(e) => set("hookEn", e.target.value)}
          />
        </div>
      </AdminCard>

      {/* descriptions */}
      <AdminCard title="الوصف" description="فقرات منفصلة — تظهر بالترتيب في صفحة المنتج.">
        <div className="grid gap-6 md:grid-cols-2">
          <LinesEditor
            label="الوصف (عربي)"
            lines={draft.descriptionAr}
            onChange={(next) => set("descriptionAr", next)}
          />
          <LinesEditor
            label="الوصف (إنجليزي)"
            lines={draft.descriptionEn}
            onChange={(next) => set("descriptionEn", next)}
          />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextArea
            label="طريقة التخزين (عربي)"
            name="storageAr"
            rows={3}
            value={draft.storageAr}
            onChange={(e) => set("storageAr", e.target.value)}
          />
          <TextArea
            label="طريقة التخزين (إنجليزي)"
            name="storageEn"
            dir="ltr"
            rows={3}
            value={draft.storageEn}
            onChange={(e) => set("storageEn", e.target.value)}
          />
          <TextInput
            label="شارة (عربي)"
            name="badgeAr"
            hint="مثل: «بكر ممتاز» — اتركه فارغًا لإخفاء الشارة."
            value={draft.badgeAr ?? ""}
            onChange={(e) => set("badgeAr", e.target.value)}
          />
          <TextInput
            label="شارة (إنجليزي)"
            name="badgeEn"
            dir="ltr"
            value={draft.badgeEn ?? ""}
            onChange={(e) => set("badgeEn", e.target.value)}
          />
        </div>
      </AdminCard>

      {/* variants */}
      <AdminCard
        title="الأحجام والأسعار"
        description="كل حجم = SKU مستقل بسعره ومخزونه. استخدم الأسهم لتغيير ترتيب ظهور الأحجام في المتجر — الترتيب هنا هو الترتيب المعروض."
        action={
          <MiniButton onClick={() => set("variants", [...draft.variants, newVariant(draft.variants.length + 1)])}>
            + حجم
          </MiniButton>
        }
      >
        {err("variants") ? <FormMessage>{err("variants")}</FormMessage> : null}
        <div className="space-y-3">
          {draft.variants.map((v, i) => (
            <div key={i} className="grid gap-3 border border-gold/15 bg-cream/20 p-3 md:grid-cols-12">
              <TextInput
                label="حجم (عربي)"
                name={`v-${i}-ar`}
                className="md:col-span-2"
                required
                value={v.sizeLabelAr}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, sizeLabelAr: e.target.value };
                  set("variants", next);
                }}
              />
              <TextInput
                label="حجم (إنجليزي)"
                name={`v-${i}-en`}
                dir="ltr"
                className="md:col-span-2"
                required
                value={v.sizeLabelEn}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, sizeLabelEn: e.target.value };
                  set("variants", next);
                }}
              />
              <TextInput
                label="مل"
                name={`v-${i}-ml`}
                type="number"
                min={0}
                className="md:col-span-1"
                value={v.ml}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, ml: num(e.target.value) };
                  set("variants", next);
                }}
              />
              <TextInput
                label="السعر"
                name={`v-${i}-price`}
                type="number"
                min={0}
                required
                className="md:col-span-2"
                value={v.price}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, price: num(e.target.value) };
                  set("variants", next);
                }}
              />
              <TextInput
                label="تكلفة الوحدة"
                name={`v-${i}-cost`}
                type="number"
                min={0}
                hint="اختياري — لحساب الربح الإجمالي"
                className="md:col-span-2"
                value={v.cost ?? ""}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, cost: e.target.value === "" ? null : num(e.target.value) };
                  set("variants", next);
                }}
              />
              <TextInput
                label="السعر قبل الخصم"
                name={`v-${i}-compare`}
                type="number"
                min={0}
                hint="فارغ = بلا خصم"
                className="md:col-span-2"
                value={v.compareAt ?? ""}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, compareAt: e.target.value ? num(e.target.value) : null };
                  set("variants", next);
                }}
              />
              <TextInput
                label="المخزون"
                name={`v-${i}-stock`}
                type="number"
                min={0}
                hint="فارغ = غير متتبع"
                className="md:col-span-2"
                value={v.stock ?? ""}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, stock: e.target.value === "" ? null : num(e.target.value) };
                  set("variants", next);
                }}
              />
              <TextInput
                label="SKU"
                name={`v-${i}-sku`}
                dir="ltr"
                className="md:col-span-2"
                value={v.sku}
                onChange={(e) => {
                  const next = [...draft.variants];
                  next[i] = { ...v, sku: e.target.value };
                  set("variants", next);
                }}
              />
              <div className="flex items-end justify-between gap-2 md:col-span-10">
                <p className="tnum text-[0.72rem] text-ink-muted">
                  {formatPrice(v.price)} {v.stock !== null ? `· مخزون ${v.stock}` : "· غير متتبع"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.68rem] text-ink-muted">الترتيب</span>
                  <MiniButton
                    onClick={() => moveVariant(i, -1)}
                    disabled={i === 0}
                    aria-label="تحريك الحجم لأعلى"
                  >
                    ↑
                  </MiniButton>
                  <MiniButton
                    onClick={() => moveVariant(i, 1)}
                    disabled={i === draft.variants.length - 1}
                    aria-label="تحريك الحجم لأسفل"
                  >
                    ↓
                  </MiniButton>
                  <MiniButton
                    onClick={() =>
                      set(
                        "variants",
                        draft.variants.filter((_, j) => j !== i),
                      )
                    }
                    disabled={draft.variants.length <= 1}
                    className="text-red-900"
                  >
                    حذف الحجم
                  </MiniButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* images */}
      <AdminCard
        title="الصور"
        description="الصورة الأولى (أو المحددة كأساسية) تظهر في المتجر والنتائج. حتى 12 صورة."
        action={<MediaPicker onSelect={addImage} triggerLabel="+ إضافة صورة" />}
      >
        {draft.images.length === 0 ? (
          <p className="border border-dashed border-gold/40 bg-cream/20 px-4 py-8 text-center text-[0.8rem] text-ink-muted">
            لا توجد صور — سيُستخدم شعار الزجاجة الافتراضي في المتجر.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {draft.images.map((img, i) => (
              <li
                key={`${img.src}-${i}`}
                className={
                  img.isPrimary
                    ? "border border-forest bg-sage/10 p-2.5"
                    : "border border-gold/20 bg-cream/20 p-2.5"
                }
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-ivory">
                  <Image src={img.src} alt="" fill sizes="240px" className="object-contain p-2" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[0.7rem] text-forest">
                    <input
                      type="radio"
                      name="primary-image"
                      checked={img.isPrimary}
                      onChange={() => setPrimary(i)}
                      className="accent-[#26311f]"
                    />
                    أساسية
                  </label>
                  <div className="flex gap-1">
                    <MiniButton onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="تحريك لليسار">
                      ←
                    </MiniButton>
                    <MiniButton
                      onClick={() => moveImage(i, 1)}
                      disabled={i === draft.images.length - 1}
                      aria-label="تحريك لليمين"
                    >
                      →
                    </MiniButton>
                    <MiniButton
                      onClick={() =>
                        set(
                          "images",
                          draft.images.filter((_, j) => j !== i),
                        )
                      }
                      className="text-red-900"
                      aria-label="حذف الصورة"
                    >
                      ✕
                    </MiniButton>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    aria-label="النص البديل (عربي)"
                    placeholder="نص بديل عربي"
                    value={img.altAr}
                    onChange={(e) => {
                      const next = [...draft.images];
                      next[i] = { ...img, altAr: e.target.value };
                      set("images", next);
                    }}
                    className={inputClass + " h-9 text-[0.72rem]"}
                  />
                  <input
                    aria-label="النص البديل (إنجليزي)"
                    dir="ltr"
                    placeholder="Alt text EN"
                    value={img.altEn}
                    onChange={(e) => {
                      const next = [...draft.images];
                      next[i] = { ...img, altEn: e.target.value };
                      set("images", next);
                    }}
                    className={inputClass + " h-9 text-[0.72rem]"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {/* specs */}
      <AdminCard
        title="المواصفات"
        description="جدول مواصفات اختياري (المادة، بلد المنشأ…) — يظهر فقط عند إدخاله."
        action={
          <MiniButton
            onClick={() =>
              set("specs", [...draft.specs, { labelAr: "", labelEn: "", valueAr: "", valueEn: "" }])
            }
          >
            + صف
          </MiniButton>
        }
      >
        {draft.specs.length === 0 ? (
          <p className="text-[0.8rem] text-ink-muted">لا توجد مواصفات.</p>
        ) : (
          <div className="space-y-3">
            {draft.specs.map((s, i) => (
              <div key={i} className="grid gap-3 border border-gold/15 bg-cream/20 p-3 md:grid-cols-5">
                <TextInput
                  label="البيان (عربي)"
                  name={`s-${i}-la`}
                  value={s.labelAr}
                  onChange={(e) => {
                    const next = [...draft.specs];
                    next[i] = { ...s, labelAr: e.target.value };
                    set("specs", next);
                  }}
                />
                <TextInput
                  label="البيان (إنجليزي)"
                  name={`s-${i}-le`}
                  dir="ltr"
                  value={s.labelEn}
                  onChange={(e) => {
                    const next = [...draft.specs];
                    next[i] = { ...s, labelEn: e.target.value };
                    set("specs", next);
                  }}
                />
                <TextInput
                  label="القيمة (عربي)"
                  name={`s-${i}-va`}
                  value={s.valueAr}
                  onChange={(e) => {
                    const next = [...draft.specs];
                    next[i] = { ...s, valueAr: e.target.value };
                    set("specs", next);
                  }}
                />
                <TextInput
                  label="القيمة (إنجليزي)"
                  name={`s-${i}-ve`}
                  dir="ltr"
                  value={s.valueEn}
                  onChange={(e) => {
                    const next = [...draft.specs];
                    next[i] = { ...s, valueEn: e.target.value };
                    set("specs", next);
                  }}
                />
                <div className="flex items-end">
                  <MiniButton
                    onClick={() => set("specs", draft.specs.filter((_, j) => j !== i))}
                    className="text-red-900"
                  >
                    حذف
                  </MiniButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* flags */}
      <AdminCard title="الظهور والمخزون">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-[0.82rem] text-forest">
              <Toggle label="ظاهر في المتجر" checked={draft.active} onChange={(v) => set("active", v)} />
              ظاهر في المتجر
            </label>
            <label className="flex items-center gap-3 text-[0.82rem] text-forest">
              <Toggle label="منتج مميز" checked={draft.featured} onChange={(v) => set("featured", v)} />
              مميز (يظهر في الرئيسية)
            </label>
            <label className="flex items-center gap-3 text-[0.82rem] text-forest">
              <Toggle
                label="قريبًا"
                checked={draft.comingSoon}
                onChange={(v) => set("comingSoon", v)}
              />
              قريبًا (يظهر في المتجر بدون إمكانية الشراء)
            </label>
            <label className="flex items-center gap-3 text-[0.82rem] text-forest">
              <Toggle label="بيانات تجريبية" checked={draft.sample} onChange={(v) => set("sample", v)} />
              بيانات تجريبية (إشعار الأسعار)
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="ترتيب العرض"
              name="sortOrder"
              type="number"
              hint="الأصغر أولًا — أو استخدم أسهم الترتيب في قائمة المنتجات."
              value={draft.sortOrder}
              onChange={(e) => set("sortOrder", num(e.target.value))}
            />
            <TextInput
              label="حد تنبيه المخزون"
              name="lowStockThreshold"
              type="number"
              min={0}
              hint="عند هذا الرقم أو أقل يظهر تنبيه."
              value={draft.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", num(e.target.value, 5))}
            />
          </div>
        </div>
      </AdminCard>

      <div className="flex flex-wrap items-center gap-3">
        <ConfirmSubmit
          message={product ? "حفظ تعديلات المنتج؟ ستظهر في المتجر فورًا." : "إضافة المنتج إلى المتجر؟"}
          className="inline-flex h-12 items-center rounded-xs bg-forest px-7 text-[0.85rem] text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : product ? "حفظ التعديلات" : "إضافة المنتج"}
        </ConfirmSubmit>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="inline-flex h-12 items-center rounded-xs border border-forest/25 px-6 text-[0.85rem] text-forest transition-colors hover:border-forest/70"
        >
          إلغاء
        </button>
        {pending ? <span className="text-[0.78rem] text-ink-muted">جارٍ المعالجة…</span> : null}
      </div>
    </form>
  );
}
