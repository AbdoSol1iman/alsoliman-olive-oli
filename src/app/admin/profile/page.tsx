import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin-users";
import { formatDate } from "@/lib/format";
import { AdminUsersManager, PasswordForm, ProfileForm } from "@/components/admin/ProfilePanels";

export const instant = false;

export const metadata = { title: "الملف الشخصي · Admin" };

export default async function AdminProfilePage() {
  await connection(); // admin renders per-request (session cookie)
  const session = await requireAdmin();
  const users = listAdminUsers();

  const roleLabel = session.role === "owner" ? "مالك المتجر" : "مدير";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">الملف الشخصي</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          حسابك الحالي: <span className="text-forest">{session.email}</span> — {roleLabel}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileForm initial={{ name: session.name, email: session.email }} />
        <PasswordForm />
      </div>

      <AdminUsersManager
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          created_at: u.created_at,
          last_login_at: u.last_login_at,
        }))}
        currentId={session.id}
        isOwner={session.role === "owner"}
      />

      <p className="text-[0.72rem] text-ink-muted">
        جلستك بدأت في هذه الجولة — تغيير كلمة المرور يُنهي كل الجلسات الأخرى فورًا.
        {users[0] ? ` أول حساب أُنشئ في ${formatDate(users[0].created_at)}.` : null}
      </p>
    </div>
  );
}
