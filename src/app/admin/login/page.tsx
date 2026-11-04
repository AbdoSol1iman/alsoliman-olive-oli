import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getSession } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <div>
      <div className="border border-gold/25 bg-ivory p-8 shadow-soft">
        <h1 className="text-[1.5rem]">لوحة التحكم</h1>
        <p className="mt-1.5 text-[0.8rem] leading-6 text-ink-muted">
          الدخول للإدارة مخصص لصاحب المتجر فقط.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
      {process.env.NODE_ENV !== "production" ? (
        <p className="mt-4 text-center text-[0.7rem] leading-6 text-ink-muted">
          بيئة التطوير: admin@alsuliman.local / alsuliman-dev
          <br />
          يُفضّل ضبط ADMIN_EMAIL و ADMIN_PASSWORD و ADMIN_SESSION_SECRET في الإنتاج.
        </p>
      ) : null}
    </div>
  );
}
