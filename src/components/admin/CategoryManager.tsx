"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/products";
import { categoryInputSchema } from "@/lib/admin-schemas";
import { saveCategoryAction, deleteCategoryAction } from "@/app/actions/catalog";
import {
  AdminCard,
  EmptyState,
  FormMessage,
  MiniButton,
  Table,
  Td,
  TextInput,
  Th,
  Toggle,
  humanError,
} from "./ui";

type Draft = { slug: string; nameAr: string; nameEn: string; sortOrder: number; active: boolean };

const emptyDraft: Draft = { slug: "", nameAr: "", nameEn: "", sortOrder: 0, active: true };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const startNew = () => {
    setMessage(null);
    setEditingId(null);
    setDraft({ ...emptyDraft, sortOrder: categories.length });
  };

  const startEdit = (category: Category) => {
    setMessage(null);
    setEditingId(category.id);
    setDraft({
      slug: category.slug,
      nameAr: category.nameAr,
      nameEn: category.nameEn,
      sortOrder: category.sortOrder,
      active: category.active,
    });
  };

  const close = () => {
    setEditingId(null);
    setDraft(null);
    setMessage(null);
  };

  const save = () => {
    if (!draft) return;
    const parsed = categoryInputSchema.safeParse(draft);
    if (!parsed.success) {
      setMessage({ ok: false, text: humanError(parsed.error.issues[0]?.message ?? "invalid_input") });
      return;
    }
    startTransition(async () => {
      const result = await saveCategoryAction(editingId, parsed.data);
      setMessage(
        result.ok
          ? { ok: true, text: "تم حفظ التصنيف وظهر في المتجر فورًا." }
          : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) {
        setEditingId(null);
        setDraft(null);
        router.refresh();
      }
    });
  };

  const remove = (id: string, name: string) => {
    if (!window.confirm(`حذف التصنيف «${name}»؟ المنتجات تحتفظ بمعرّف التصنيف لكنه لن يظهر في الفلاتر.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      setMessage(
        result.ok ? { ok: true, text: "تم حذف التصنيف." } : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-[0.82rem] leading-7 text-ink-muted">
          التصنيفات تظهر في فلاتر المتجر بالعربية والإنجليزية. أي تعديل هنا يظهر مباشرة بدون إعادة نشر.
        </p>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex h-11 items-center rounded-xs bg-forest px-5 text-[0.82rem] text-ivory transition-colors hover:bg-forest-deep"
        >
          + إضافة تصنيف
        </button>
      </div>

      {message ? <FormMessage tone={message.ok ? "success" : "error"}>{message.text}</FormMessage> : null}

      {draft ? (
        <AdminCard
          title={editingId ? "تعديل التصنيف" : "تصنيف جديد"}
          description="الاسم بالعربية والإنجليزية يظهر للعميل في فلاتر الصفحة."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="المعرّف (slug)"
              hint="حروف إنجليزية صغيرة وأشرط فقط — يُستخدم في روابط الفلاتر."
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              placeholder="classic"
              dir="ltr"
            />
            <TextInput
              label="الترتيب"
              type="number"
              value={draft.sortOrder}
              onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })}
            />
            <TextInput
              label="الاسم بالعربية"
              value={draft.nameAr}
              onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
            />
            <TextInput
              label="الاسم بالإنجليزية"
              value={draft.nameEn}
              onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="mt-4 flex items-center gap-2 text-[0.76rem] text-ink-muted">
            <Toggle
              label="ظاهر في فلاتر المتجر"
              checked={draft.active}
              onChange={(v) => setDraft({ ...draft, active: v })}
            />
            {draft.active ? "ظاهر" : "مخفي"}
          </div>
          <div className="mt-5 flex gap-2">
            <MiniButton
              onClick={save}
              disabled={pending}
              className="h-10 border-forest bg-forest px-5 text-ivory hover:bg-forest-deep"
            >
              {pending ? "جارٍ الحفظ…" : "حفظ التصنيف"}
            </MiniButton>
            <MiniButton onClick={close} className="h-10 px-4">
              إلغاء
            </MiniButton>
          </div>
        </AdminCard>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          title="لا توجد تصنيفات بعد"
          body="أضف تصنيفًا هنا ثم اختره لأي منتج، أو اترك المنتجات بدون تصنيف."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>المعرّف</Th>
              <Th>العربية</Th>
              <Th>English</Th>
              <Th>الترتيب</Th>
              <Th>الحالة</Th>
              <Th>إجراءات</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-cream/30">
                <Td className="font-mono text-[0.72rem] text-forest"><span dir="ltr">{category.slug}</span></Td>
                <Td>{category.nameAr}</Td>
                <Td><span dir="ltr">{category.nameEn}</span></Td>
                <Td className="tnum">{category.sortOrder}</Td>
                <Td>
                  <span
                    className={
                      category.active
                        ? "rounded-full bg-sage/20 px-2.5 py-1 text-[0.7rem] text-forest"
                        : "rounded-full bg-ink/5 px-2.5 py-1 text-[0.7rem] text-ink-muted"
                    }
                  >
                    {category.active ? "ظاهر" : "مخفي"}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <MiniButton onClick={() => startEdit(category)}>تعديل</MiniButton>
                    <MiniButton
                      onClick={() => remove(category.id, category.nameAr || category.slug)}
                      disabled={pending}
                      className="border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory"
                    >
                      حذف
                    </MiniButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
