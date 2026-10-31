"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

export function AdminLoginForm() {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="admin-email" className="mb-1.5 block text-[0.78rem] text-forest">
          البريد الإلكتروني
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="username"
          required
          className="h-12 w-full border border-forest/20 bg-ivory px-4 text-[0.9rem] outline-none focus:border-gold"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-1.5 block text-[0.78rem] text-forest">
          كلمة المرور
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          className="h-12 w-full border border-forest/20 bg-ivory px-4 text-[0.9rem] outline-none focus:border-gold"
        />
      </div>
      {error ? (
        <p role="alert" className="border border-red-800/30 bg-red-50/60 p-3 text-[0.78rem] text-red-900">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ الدخول…" : "دخول"}
      </Button>
    </form>
  );
}
