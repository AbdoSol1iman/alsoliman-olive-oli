"use client";

import { type ComponentProps, type ReactNode } from "react";
import { cx } from "@/lib/format";
import type { OrderStatus } from "@/lib/orders";

/* ------------------------------------------------------------------ */
/* Containers                                                          */
/* ------------------------------------------------------------------ */

export function AdminCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx("border border-gold/20 bg-ivory", className)}>
      {title || action ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/15 bg-cream/30 px-5 py-3.5">
          <div>
            {title ? <h2 className="text-[0.95rem] text-forest">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[0.72rem] text-ink-muted">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export const inputClass =
  "h-11 w-full border border-forest/20 bg-ivory px-3 text-[0.85rem] text-charcoal outline-none transition-colors placeholder:text-ink-muted/50 focus:border-gold";

export const textareaClass =
  "w-full border border-forest/20 bg-ivory px-3 py-2.5 text-[0.85rem] leading-7 text-charcoal outline-none transition-colors placeholder:text-ink-muted/50 focus:border-gold resize-y";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.75rem] text-forest">
        {label}
        {required ? <span className="text-gold"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[0.72rem] text-red-800">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[0.7rem] leading-5 text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: ComponentProps<"input"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}) {
  const id = props.id ?? props.name;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <input id={id} className={inputClass} {...props} />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: ComponentProps<"textarea"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}) {
  const id = props.id ?? props.name;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <textarea id={id} className={textareaClass} rows={3} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: ComponentProps<"select"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}) {
  const id = props.id ?? props.name;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <select id={id} className={cx(inputClass, "appearance-none pe-8")} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300",
        checked ? "border-forest bg-forest" : "border-forest/25 bg-cream",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cx(
          "inline-block size-4.5 rounded-full bg-ivory shadow transition-transform duration-300",
          checked ? "translate-x-1" : "-translate-x-1",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "border p-3 text-[0.78rem] leading-6",
        tone === "error"
          ? "border-red-800/30 bg-red-50/50 text-red-900"
          : "border-forest/25 bg-sage/15 text-forest",
      )}
    >
      {children}
    </p>
  );
}

export const errorText: Record<string, string> = {
  invalid_input: "بيانات غير صالحة، راجع الحقول.",
  slug_taken: "الرابط (slug) مستخدم لمنتج آخر.",
  email_taken: "هذا البريد مسجّل بالفعل.",
  wrong_current_password: "كلمة المرور الحالية غير صحيحة.",
  weak_password: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتشمل حرفًا ورقمًا.",
  password_unchanged: "كلمة المرور الجديدة مطابقة للحالية.",
  forbidden: "هذا الإجراء متاح لصاحب المتجر فقط.",
  cannot_delete_self: "لا يمكنك حذف حسابك الحالي.",
  cannot_delete_last_owner: "لا يمكن حذف آخر حساب مالك.",
  not_found: "غير موجود.",
  media_in_use: "هذه الصورة مستخدمة حاليًا في صفحة أو منتج — لا يمكن حذفها.",
  unsupported_type: "نوع الملف غير مدعوم. الصور المدعومة: JPG, PNG, WebP, AVIF, GIF.",
  file_too_large: "حجم الملف أكبر من 12 ميجابايت.",
  upload_failed: "فشل رفع الملف، حاول مرة أخرى.",
  save_failed: "فشل الحفظ، حاول مرة أخرى.",
  delete_failed: "فشل الحذف، حاول مرة أخرى.",
  update_failed: "فشل التحديث، حاول مرة أخرى.",
  unavailable: "منتج أو حجم غير متوفر حاليًا.",
  zone_fee_missing: "المحافظة غير موجودة في إعدادات الشحن.",
};

export const humanError = (code: string) => errorText[code] ?? code;

/* ------------------------------------------------------------------ */
/* Order status                                                        */
/* ------------------------------------------------------------------ */

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  processing: "قيد التجهيز",
  shipped: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

export const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const statusTone: Record<OrderStatus, string> = {
  pending: "border-gold/50 bg-gold/15 text-forest",
  confirmed: "border-olive/40 bg-olive/15 text-forest",
  processing: "border-olive/50 bg-olive/25 text-forest-deep",
  shipped: "border-forest/30 bg-forest/15 text-forest-deep",
  delivered: "border-forest/40 bg-forest/25 text-forest-deep",
  cancelled: "border-red-800/30 bg-red-100/50 text-red-900",
};

export function StatusBadge({ status }: { status: string }) {
  const known = (STATUS_ORDER as string[]).includes(status);
  return (
    <span
      className={cx(
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.68rem]",
        known ? statusTone[status as OrderStatus] : "border-forest/20 bg-cream text-ink-muted",
      )}
    >
      {known ? STATUS_LABELS[status as OrderStatus] : status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm action button (native confirm — reliable everywhere)        */
/* ------------------------------------------------------------------ */

export function ConfirmButton({
  message,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { message: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        props.onClick?.(e);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

/** Wraps a submit button so the form asks for confirmation first. */
export function ConfirmSubmit({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto border border-gold/20", className)}>
      <table className="w-full min-w-[720px] border-collapse text-[0.82rem]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cx("bg-forest px-4 py-2.5 text-start font-medium text-ivory", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-4 py-3 text-ink-muted", className)}>{children}</td>;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="border border-dashed border-gold/40 bg-cream/20 px-6 py-12 text-center">
      <p className="text-[0.95rem] text-forest">{title}</p>
      {body ? <p className="mt-2 text-[0.8rem] leading-7 text-ink-muted">{body}</p> : null}
    </div>
  );
}

/** Small pill button used inside rows (toggle, delete, …). */
export function MiniButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-8 items-center justify-center rounded-xs border border-forest/20 px-2.5 text-[0.72rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
