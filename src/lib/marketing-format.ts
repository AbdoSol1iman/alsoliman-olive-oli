import { formatNumber, formatPrice } from "./format";
import type { KpiFormat } from "./marketing-types";

export function formatMetric(value: number | null, format: KpiFormat): string {
  if (value === null || Number.isNaN(value)) return "لا توجد بيانات كافية";
  switch (format) {
    case "currency":
      return formatPrice(value);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "ratio":
      return `${value.toFixed(2)}×`;
    default:
      return formatNumber(Math.round(value), "en");
  }
}

export function formatChange(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "لا مقارنة كافية";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function changeTone(
  value: number | null,
  direction: "up" | "down" | "none" = "up",
): "good" | "bad" | "flat" {
  if (value === null || direction === "none" || value === 0) return "flat";
  const positive = value > 0;
  return (direction === "up") === positive ? "good" : "bad";
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function shortDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
