"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 rounded-xs bg-forest px-4 text-[0.78rem] text-ivory transition-colors hover:bg-forest-deep"
    >
      🖨 طباعة / حفظ PDF
    </button>
  );
}
