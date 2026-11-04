import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listMedia } from "@/lib/media";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export const instant = false;

export const metadata = { title: "مكتبة الوسائط · Admin" };

export default async function AdminMediaPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const items = await listMedia();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">مكتبة الوسائط</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          {items.length} صورة محفوظة بشكل دائم — ارفع، عدّل الوصف والتصنيف، أو احذف الصور غير المستخدمة.
        </p>
      </div>
      <MediaLibrary initial={items} />
    </div>
  );
}
