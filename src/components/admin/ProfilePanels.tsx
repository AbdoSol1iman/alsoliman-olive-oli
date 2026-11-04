"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changePasswordAction,
  createAdminAction,
  deleteAdminAction,
  resetAdminPasswordAction,
  updateProfileAction,
} from "@/app/actions/admin";
import { humanError, inputClass, MiniButton, Toggle } from "./ui";
import { cx } from "@/lib/format";
import type { AdminUser } from "@/lib/admin-users";

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[0.75rem] text-forest">{label}</span>
    {children}
    {hint ? <span className="mt-1 block text-[0.68rem] text-ink-muted">{hint}</span> : null}
  </label>
);

export function ProfileForm({ initial }: { initial: { name: string; email: string } }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfileAction({ name, email });
      setMessage(
        result.ok
          ? { ok: true, text: "تم تحديث بياناتك ✓" }
          : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="border border-gold/20 bg-ivory">
      <header className="border-b border-gold/15 bg-cream/30 px-5 py-3.5">
        <h2 className="text-[0.95rem] text-forest">حسابي</h2>
        <p className="mt-0.5 text-[0.72rem] text-ink-muted">
          الاسم والبريد المستخدمان لتسجيل الدخول. تغيير البريد يُنهي الجلسات الأخرى.
        </p>
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="الاسم">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={cx(inputClass, "text-[0.82rem]")} />
        </Field>
        <Field label="البريد الإلكتروني" hint="يُستخدم لتسجيل الدخول">
          <input
            type="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cx(inputClass, "text-[0.82rem]")}
          />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <MiniButton
            type="submit"
            disabled={pending}
            className="h-10 border-forest bg-forest px-5 text-ivory hover:bg-forest-deep"
          >
            {pending ? "جارٍ الحفظ…" : "حفظ البيانات"}
          </MiniButton>
          {message ? (
            <span className={cx("text-[0.75rem]", message.ok ? "text-forest" : "text-red-900")}>
              {message.text}
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (next !== confirm) {
      setMessage({ ok: false, text: "تأكيد كلمة المرور غير مطابق." });
      return;
    }
    startTransition(async () => {
      const result = await changePasswordAction({ current, next });
      setMessage(
        result.ok
          ? { ok: true, text: "تم تغيير كلمة المرور ✓ (أُغلقت الجلسات الأخرى)" }
          : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) {
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  };

  return (
    <form onSubmit={submit} className="border border-gold/20 bg-ivory">
      <header className="border-b border-gold/15 bg-cream/30 px-5 py-3.5">
        <h2 className="text-[0.95rem] text-forest">تغيير كلمة المرور</h2>
        <p className="mt-0.5 text-[0.72rem] text-ink-muted">٨ أحرف على الأقل وتشمل حرفًا ورقمًا.</p>
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="كلمة المرور الحالية">
          <input
            type="password"
            dir="ltr"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={cx(inputClass, "text-[0.82rem]")}
          />
        </Field>
        <Field label="كلمة المرور الجديدة">
          <input
            type="password"
            dir="ltr"
            required
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={cx(inputClass, "text-[0.82rem]")}
          />
        </Field>
        <Field label="تأكيد كلمة المرور">
          <input
            type="password"
            dir="ltr"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cx(inputClass, "text-[0.82rem]")}
          />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-3">
          <MiniButton
            type="submit"
            disabled={pending}
            className="h-10 border-forest bg-forest px-5 text-ivory hover:bg-forest-deep"
          >
            {pending ? "جارٍ التغيير…" : "تغيير كلمة المرور"}
          </MiniButton>
          {message ? (
            <span className={cx("text-[0.75rem]", message.ok ? "text-forest" : "text-red-900")}>
              {message.text}
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/** Owner-only: create, reset and delete admin accounts. */
export function AdminUsersManager({
  users,
  currentId,
  isOwner,
}: {
  users: Pick<AdminUser, "id" | "email" | "name" | "role" | "created_at" | "last_login_at">[];
  currentId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [asOwner, setAsOwner] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isOwner) {
    return (
      <div className="border border-gold/20 bg-ivory p-5">
        <h2 className="text-[0.95rem] text-forest">حسابات الإدارة</h2>
        <p className="mt-2 text-[0.78rem] leading-7 text-ink-muted">
          إدارة حسابات المدراء متاحة لصاحب المتجر فقط. يمكنك التواصل معه لإضافة حساب أو تغيير صلاحياته.
        </p>
      </div>
    );
  }

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await createAdminAction({
        email,
        name,
        password,
        role: asOwner ? "owner" : "admin",
      });
      setMessage(
        result.ok ? { ok: true, text: "تم إنشاء الحساب ✓" } : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) {
        setEmail("");
        setName("");
        setPassword("");
        setAsOwner(false);
        router.refresh();
      }
    });
  };

  const remove = (user: { id: string; email: string }) => {
    if (!window.confirm(`حذف حساب «${user.email}»؟ لن يستطيع الدخول بعد الآن.`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAdminAction(user.id);
      setMessage(
        result.ok ? { ok: true, text: "تم حذف الحساب." } : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) router.refresh();
    });
  };

  const saveReset = () => {
    if (!resetId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await resetAdminPasswordAction(resetId, resetPassword);
      setMessage(
        result.ok ? { ok: true, text: "تم إعادة تعيين كلمة المرور ✓" } : { ok: false, text: humanError(result.error) },
      );
      if (result.ok) {
        setResetId(null);
        setResetPassword("");
        router.refresh();
      }
    });
  };

  return (
    <div className="border border-gold/20 bg-ivory">
      <header className="border-b border-gold/15 bg-cream/30 px-5 py-3.5">
        <h2 className="text-[0.95rem] text-forest">حسابات الإدارة</h2>
        <p className="mt-0.5 text-[0.72rem] text-ink-muted">
          «المالك» يدير الإعدادات والحسابات وحذف المنتجات. «مدير» يمكنه إدارة المتجر اليومية فقط.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[0.78rem]">
          <thead className="bg-forest text-ivory">
            <tr>
              <th className="px-4 py-2 text-start font-medium">الحساب</th>
              <th className="px-4 py-2 text-start font-medium">الصلاحية</th>
              <th className="px-4 py-2 text-start font-medium">آخر دخول</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/12 bg-ivory">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="text-forest">{u.name || "—"}</p>
                  <p className="text-[0.7rem] text-ink-muted" dir="ltr">
                    {u.email}
                    {u.id === currentId ? " (أنت)" : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      u.role === "owner"
                        ? "rounded-full bg-gold/20 px-2.5 py-0.5 text-[0.7rem] text-forest"
                        : "rounded-full bg-sage/20 px-2.5 py-0.5 text-[0.7rem] text-forest"
                    }
                  >
                    {u.role === "owner" ? "مالك" : "مدير"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[0.72rem] text-ink-muted">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("ar-EG") : "لم يسجل بعد"}
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex justify-end gap-1.5">
                    <MiniButton onClick={() => { setResetId(u.id); setResetPassword(""); }}>
                      إعادة تعيين كلمة المرور
                    </MiniButton>
                    {u.id !== currentId ? (
                      <MiniButton
                        onClick={() => remove(u)}
                        className="border-red-900/30 text-red-900 hover:bg-red-900 hover:text-ivory"
                      >
                        حذف
                      </MiniButton>
                    ) : null}
                  </div>
                  {resetId === u.id ? (
                    <div className="mt-2 flex justify-end gap-2">
                      <input
                        type="password"
                        dir="ltr"
                        placeholder="كلمة مرور جديدة"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className={cx(inputClass, "h-9 w-48 text-[0.78rem]")}
                      />
                      <MiniButton
                        onClick={saveReset}
                        disabled={pending}
                        className="h-9 border-forest bg-forest text-ivory hover:bg-forest-deep"
                      >
                        تأكيد
                      </MiniButton>
                      <MiniButton onClick={() => setResetId(null)} className="h-9">
                        إلغاء
                      </MiniButton>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="grid gap-4 border-t border-gold/15 bg-cream/20 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="البريد الإلكتروني">
          <input
            type="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cx(inputClass, "text-[0.82rem]")}
          />
        </Field>
        <Field label="الاسم">
          <input value={name} onChange={(e) => setName(e.target.value)} className={cx(inputClass, "text-[0.82rem]")} />
        </Field>
        <Field label="كلمة المرور" hint="٨ أحرف+حرف+رقم">
          <input
            type="password"
            dir="ltr"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cx(inputClass, "text-[0.82rem]")}
          />
        </Field>
        <div className="flex flex-col justify-end gap-2">
          <div className="flex items-center gap-2.5 py-1">
            <Toggle label="صلاحيات مالك" checked={asOwner} onChange={setAsOwner} />
            <span className="text-[0.76rem] text-ink-muted">صلاحيات مالك</span>
          </div>
          <MiniButton
            type="submit"
            disabled={pending}
            className="h-10 border-forest bg-forest px-4 text-ivory hover:bg-forest-deep"
          >
            {pending ? "جارٍ الإنشاء…" : "+ إضافة حساب"}
          </MiniButton>
        </div>
        {message ? (
          <p className={cx("text-[0.75rem] sm:col-span-2 lg:col-span-4", message.ok ? "text-forest" : "text-red-900")}>
            {message.text}
          </p>
        ) : null}
      </form>
    </div>
  );
}
