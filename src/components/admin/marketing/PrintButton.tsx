"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center rounded-xs border border-forest/25 px-3.5 text-[0.74rem] text-forest transition-colors hover:border-forest hover:bg-forest hover:text-ivory print:hidden"
    >
      طباعة / PDF
    </button>
  );
}
