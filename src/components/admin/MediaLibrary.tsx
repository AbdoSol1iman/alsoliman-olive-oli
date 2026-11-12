"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { deleteMediaAction, uploadMediaAction, updateMediaMetaAction } from "@/app/actions/media";
import { prepareImageForUpload } from "@/lib/image-compress";
import { MEDIA_CATEGORIES, type MediaItem } from "@/lib/media-shared";
import { cx } from "@/lib/format";
import { FormMessage, humanError, inputClass, MiniButton } from "./ui";

const categoryLabel: Record<string, string> = {
  product: "منتجات",
  banner: "بانرات",
  brand: "علامة تجارية",
  general: "عام",
};

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} ميجا` : `${Math.max(1, Math.round(bytes / 1024))} كيلو`;

export function MediaLibrary({ initial }: { initial: MediaItem[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [editDraft, setEditDraft] = useState({ altAr: "", altEn: "", category: "general" });
  const [pending, startTransition] = useTransition();

  const reload = async (category?: string) => {
    // refresh from the server action so the list always matches the DB
    try {
      const { listMediaAction } = await import("@/app/actions/media");
      const list = await listMediaAction(category || undefined);
      setItems(list);
    } catch {
      /* page refresh is the fallback */
    }
  };

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (uploading) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage({ ok: false, text: "اختر ملفًا أولًا." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      formData.set("file", await prepareImageForUpload(file));
      const result = await uploadMediaAction(formData);
      if (!result.ok) setMessage({ ok: false, text: humanError(result.error) });
      else {
        form.reset();
        setMessage({ ok: true, text: "تم رفع الصورة وتحسينها تلقائيًا (WebP)." });
        await reload(filter);
      }
    } catch (error) {
      setMessage({
        ok: false,
        text:
          (error as Error).message === "file_too_large"
            ? humanError("file_too_large")
            : "فشل رفع الملف.",
      });
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (item: MediaItem) => {
    setEditing(item);
    setEditDraft({ altAr: item.altAr, altEn: item.altEn, category: item.category });
    setMessage(null);
  };

  const saveMeta = () => {
    if (!editing) return;
    setMessage(null);
    startTransition(async () => {
      const result = await updateMediaMetaAction(editing.id, editDraft);
      setMessage(
        result.ok ? { ok: true, text: "تم حفظ بيانات الصورة." } : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) {
        setEditing(null);
        await reload(filter);
      }
    });
  };

  const remove = (item: MediaItem) => {
    if (!window.confirm(`حذف الصورة «${item.originalName}»؟ لا يمكن التراجع.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteMediaAction(item.id);
      setMessage(
        result.ok ? { ok: true, text: "تم حذف الصورة." } : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) {
        setEditing(null);
        await reload(filter);
      }
    });
  };

  const visible = filter ? items.filter((i) => i.category === filter) : items;

  return (
    <div className="space-y-5">
      {/* Upload */}
      <form onSubmit={onUpload} className="border border-gold/20 bg-ivory p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label htmlFor="ml-file" className="mb-1.5 block text-[0.75rem] text-forest">
              رفع صورة جديدة
            </label>
            <input
              id="ml-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="block w-full text-[0.78rem] file:me-3 file:rounded-xs file:border file:border-forest/25 file:bg-ivory file:px-3 file:py-2 file:text-[0.78rem] file:text-forest"
            />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[0.75rem] text-forest">التصنيف</span>
            <select name="category" className={cx(inputClass, "h-11 w-40 appearance-none text-[0.82rem]")}>
              {MEDIA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel[c] ?? c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[0.75rem] text-forest">نص بديل عربي (اختياري)</span>
            <input name="altAr" className={cx(inputClass, "h-11 w-48 text-[0.82rem]")} />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="h-11 rounded-xs bg-forest px-5 text-[0.8rem] text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
          >
            {uploading ? "جارٍ الرفع والتحسين…" : "رفع"}
          </button>
        </div>
        <p className="mt-2 text-[0.7rem] text-ink-muted">
          JPG · PNG · WebP · AVIF · GIF — تُضغط الصور الكبيرة تلقائيًا قبل الرفع، ثم تُحوَّل إلى
          WebP بجودة عالية + مصغّرة، وتُحفظ مع قاعدة البيانات فتظهر بعد كل عمليات النشر.
        </p>
      </form>

      {message ? <FormMessage tone={message.ok ? "success" : "error"}>{message.text}</FormMessage> : null}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <MiniButton onClick={() => setFilter("")} className={cx(!filter && "border-forest bg-forest text-ivory")}>
          الكل ({items.length})
        </MiniButton>
        {MEDIA_CATEGORIES.map((c) => {
          const n = items.filter((i) => i.category === c).length;
          return (
            <MiniButton
              key={c}
              onClick={() => setFilter(c)}
              className={cx(filter === c && "border-forest bg-forest text-ivory")}
            >
              {categoryLabel[c] ?? c} ({n})
            </MiniButton>
          );
        })}
      </div>

      {/* Editor */}
      {editing ? (
        <div className="border border-forest/30 bg-cream/30 p-4">
          <div className="flex flex-wrap items-start gap-4">
            <span className="relative block size-24 shrink-0 overflow-hidden border border-gold/20 bg-ivory">
              <Image
                src={editing.thumbPath ?? editing.path}
                alt=""
                fill
                sizes="96px"
                className="object-contain p-1.5"
              />
            </span>
            <div className="grid min-w-56 flex-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-[0.72rem] text-forest">الوصف بالعربية</span>
                <input
                  value={editDraft.altAr}
                  onChange={(e) => setEditDraft({ ...editDraft, altAr: e.target.value })}
                  className={cx(inputClass, "h-10 text-[0.8rem]")}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[0.72rem] text-forest">الوصف بالإنجليزية</span>
                <input
                  dir="ltr"
                  value={editDraft.altEn}
                  onChange={(e) => setEditDraft({ ...editDraft, altEn: e.target.value })}
                  className={cx(inputClass, "h-10 text-[0.8rem]")}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[0.72rem] text-forest">التصنيف</span>
                <select
                  value={editDraft.category}
                  onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                  className={cx(inputClass, "h-10 appearance-none text-[0.8rem]")}
                >
                  {MEDIA_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel[c] ?? c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <MiniButton
                onClick={saveMeta}
                disabled={pending}
                className="h-9 border-forest bg-forest px-4 text-ivory hover:bg-forest-deep"
              >
                {pending ? "جارٍ الحفظ…" : "حفظ"}
              </MiniButton>
              <MiniButton onClick={() => setEditing(null)} className="h-9 px-3">
                إغلاق
              </MiniButton>
            </div>
          </div>
          <p className="mt-2 text-[0.7rem] text-ink-muted" dir="ltr">
            {editing.path} · {editing.width ?? "?"}×{editing.height ?? "?"} · {fmtSize(editing.size)}
          </p>
        </div>
      ) : null}

      {/* Grid */}
      {visible.length === 0 ? (
        <p className="border border-dashed border-gold/40 bg-cream/20 px-6 py-12 text-center text-[0.85rem] text-ink-muted">
          لا توجد صور في هذا التصنيف — ارفع أول صورة من الأعلى.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
            <li key={item.id} className="border border-gold/20 bg-ivory p-2">
              <span className="relative block aspect-square w-full overflow-hidden bg-cream/40">
                <Image
                  src={item.thumbPath ?? item.path}
                  alt={item.altAr || item.originalName}
                  fill
                  sizes="(max-width: 640px) 45vw, 200px"
                  className="object-contain p-2"
                />
              </span>
              <p className="mt-1.5 truncate text-[0.68rem] text-forest" title={item.originalName} dir="ltr">
                {item.originalName}
              </p>
              <p className="text-[0.62rem] text-ink-muted">
                {categoryLabel[item.category] ?? item.category} · {fmtSize(item.size)}
              </p>
              <div className="mt-1.5 flex gap-1.5">
                <MiniButton onClick={() => startEdit(item)} className="flex-1">
                  تعديل
                </MiniButton>
                <MiniButton
                  onClick={() => remove(item)}
                  disabled={pending}
                  className="border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory"
                >
                  حذف
                </MiniButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
