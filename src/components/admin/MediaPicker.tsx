"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { listMediaAction, uploadMediaAction } from "@/app/actions/media";
import { prepareImageForUpload } from "@/lib/image-compress";
import type { MediaItem } from "@/lib/media-shared";
import { MEDIA_CATEGORIES } from "@/lib/media-shared";
import { cx } from "@/lib/format";
import { humanError, inputClass, MiniButton, FormMessage } from "./ui";

const categoryLabel: Record<string, string> = {
  product: "منتجات",
  banner: "بانرات",
  brand: "علامة تجارية",
  general: "عام",
};

/**
 * Media library modal: pick an existing upload or upload a new one inline.
 * Used by the product editor, homepage editor, banners and logo settings.
 */
export function MediaPicker({
  onSelect,
  current,
  triggerLabel = "اختر صورة",
}: {
  onSelect: (path: string) => void;
  /** Currently selected image path (shows its thumbnail on the trigger). */
  current?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listMediaAction(undefined);
      setItems(list);
    } catch {
      setError("فشل تحميل المكتبة.");
    } finally {
      setLoading(false);
    }
  };

  const openPicker = () => {
    setOpen(true);
    // Load on open from the event handler (not an effect) so the first paint
    // is not followed by a cascading state update.
    if (items.length === 0 && !loading) void load();
  };

  const pick = (path: string) => {
    onSelect(path);
    setOpen(false);
  };

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The picker is portaled to <body>, but React events still bubble through
    // the component tree. Without this, uploading from inside the product
    // editor also submits (and saves) the product form behind the modal.
    e.stopPropagation();
    if (uploading) return;
    setError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("اختر ملفًا أولًا.");
      return;
    }
    setUploading(true);
    try {
      formData.set("file", await prepareImageForUpload(file));
      const result = await uploadMediaAction(formData);
      if (!result.ok) {
        setError(humanError(result.error));
        return;
      }
      form.reset();
      const list = await listMediaAction(undefined);
      setItems(list);
      if (result.path) pick(result.path);
    } catch (error) {
      setError(
        (error as Error).message === "file_too_large"
          ? humanError("file_too_large")
          : "فشل رفع الملف.",
      );
    } finally {
      setUploading(false);
    }
  };

  const visible = filter ? items.filter((i) => i.category === filter) : items;

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cx(
          "flex items-center gap-3 border border-forest/20 bg-cream/30 px-3 py-2 text-[0.78rem] text-forest transition-colors hover:border-forest/50",
        )}
      >
        {current ? (
          <span className="relative block size-10 overflow-hidden bg-ivory">
            <Image src={current} alt="" fill sizes="40px" className="object-contain p-1" />
          </span>
        ) : null}
        <span>{current ? "تغيير الصورة" : triggerLabel}</span>
      </button>

      {open
        ? createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-forest-deep/55 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="مكتبة الوسائط"
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col border border-gold/30 bg-ivory shadow-lift"
          >
            <header className="flex items-center justify-between border-b border-gold/15 bg-cream/40 px-5 py-3.5">
              <h2 className="text-[0.95rem] text-forest">مكتبة الوسائط</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="grid size-8 place-items-center rounded-full text-forest hover:bg-ivory"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            {/* upload */}
            <form onSubmit={onUpload} className="flex flex-wrap items-end gap-3 border-b border-gold/15 bg-cream/20 px-5 py-4">
              <div className="min-w-40 flex-1">
                <label htmlFor="mp-file" className="mb-1.5 block text-[0.72rem] text-forest">
                  رفع صورة جديدة
                </label>
                <input
                  id="mp-file"
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  className="block w-full text-[0.75rem] file:me-3 file:rounded-xs file:border file:border-forest/25 file:bg-ivory file:px-3 file:py-1.5 file:text-[0.75rem] file:text-forest"
                />
              </div>
              <select name="category" className={cx(inputClass, "h-10 w-36 appearance-none text-[0.78rem]")}>
                {MEDIA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel[c] ?? c}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={uploading}
                className="h-10 rounded-xs bg-forest px-4 text-[0.78rem] text-ivory transition-colors hover:bg-forest-deep disabled:opacity-50"
              >
                {uploading ? "جارٍ الرفع…" : "رفع"}
              </button>
            </form>

            {/* filters */}
            <div className="flex flex-wrap gap-2 border-b border-gold/15 px-5 py-3">
              <MiniButton
                onClick={() => setFilter("")}
                className={cx(!filter && "border-forest bg-forest text-ivory")}
              >
                الكل
              </MiniButton>
              {MEDIA_CATEGORIES.map((c) => (
                <MiniButton
                  key={c}
                  onClick={() => setFilter(c)}
                  className={cx(filter === c && "border-forest bg-forest text-ivory")}
                >
                  {categoryLabel[c] ?? c}
                </MiniButton>
              ))}
            </div>

            {error ? (
              <div className="px-5 pt-3">
                <FormMessage>{error}</FormMessage>
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <p className="py-10 text-center text-[0.8rem] text-ink-muted">جارٍ التحميل…</p>
              ) : visible.length === 0 ? (
                <p className="py-10 text-center text-[0.8rem] text-ink-muted">
                  لا توجد صور بعد — ارفع أول صورة من الأعلى.
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {visible.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => pick(item.path)}
                        className="group w-full border border-gold/20 bg-cream/30 p-1.5 text-start transition-colors hover:border-forest"
                      >
                        <span className="relative block aspect-square w-full overflow-hidden bg-ivory">
                          <Image
                            src={item.thumbPath ?? item.path}
                            alt={item.altAr || item.originalName}
                            fill
                            sizes="120px"
                            className="object-contain p-1.5"
                          />
                        </span>
                        <span className="mt-1 block truncate text-[0.62rem] text-ink-muted" dir="ltr">
                          {item.originalName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )
        : null}
    </>
  );
}
