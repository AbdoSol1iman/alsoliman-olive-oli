"use client";

import { BrandMark } from "@/components/brand/Logo";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="paper flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="max-w-md text-center">
        <BrandMark size={54} className="mx-auto opacity-80" />
        <h1 className="mt-6 text-[clamp(1.5rem,3.6vw,2.1rem)]">حدث خطأ غير متوقع</h1>
        <p className="mt-3 text-[0.88rem] leading-8 text-ink-muted">
          تعذر تحميل هذا الجزء. يمكنك إعادة المحاولة أو العودة للرئيسية.
          <br />
          <span className="text-[0.78rem]">Something went wrong.</span>
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex h-11 items-center rounded-xs bg-forest px-6 text-[0.82rem] text-ivory transition-colors hover:bg-forest-deep"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
