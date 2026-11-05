export type RangePreset = "7d" | "30d" | "90d" | "month" | "last_month" | "custom";

export type AnalyticsRange = {
  from: string;
  to: string;
  /** Inclusive day count. */
  days: number;
  prevFrom: string;
  prevTo: string;
  preset: RangePreset;
  labelAr: string;
  prevLabelAr: string;
};

const DAY = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00.000Z`);
  return iso(new Date(d.getTime() + days * DAY));
};

const validIso = (value?: string | null) =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)));

const diffDays = (from: string, to: string) =>
  Math.max(1, Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY) + 1);

const formatAr = (date: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

export function parseRange(params: {
  from?: string;
  to?: string;
  preset?: string;
}): AnalyticsRange {
  const today = iso(new Date());
  const request = params.preset as RangePreset | undefined;

  let from = addDays(today, -29);
  let to = today;
  let preset: RangePreset = "30d";

  if (request === "7d" || request === "90d") {
    const n = request === "7d" ? 7 : 90;
    from = addDays(today, -(n - 1));
    preset = request;
  } else if (request === "month") {
    const d = new Date(`${today}T00:00:00.000Z`);
    from = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
    preset = "month";
  } else if (request === "last_month") {
    const d = new Date(`${today}T00:00:00.000Z`);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
    from = iso(start);
    to = iso(end);
    preset = "last_month";
  } else if (request === "custom" || validIso(params.from) || validIso(params.to)) {
    preset = "custom";
    if (validIso(params.from)) from = params.from!;
    if (validIso(params.to)) to = params.to!;
    if (from > to) [from, to] = [to, from];
    // Keep a runaway URL from triggering an unbounded query.
    if (diffDays(from, to) > 366) from = addDays(to, -365);
  }

  const days = diffDays(from, to);
  return {
    from,
    to,
    days,
    prevFrom: addDays(from, -days),
    prevTo: addDays(from, -1),
    preset,
    labelAr: `${formatAr(from)} — ${formatAr(to)}`,
    prevLabelAr: `${formatAr(addDays(from, -days))} — ${formatAr(addDays(from, -1))}`,
  };
}

export function rangeParams(
  range: Pick<AnalyticsRange, "from" | "to" | "preset">,
  extra: Record<string, string | undefined> = {},
) {
  const params = new URLSearchParams();
  params.set("preset", range.preset);
  if (range.preset === "custom") {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params;
}

export function rangeHref(
  pathname: string,
  range: Pick<AnalyticsRange, "from" | "to" | "preset">,
  extra: Record<string, string | undefined> = {},
) {
  const params = rangeParams(range, extra);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "آخر 7 أيام" },
  { value: "30d", label: "آخر 30 يومًا" },
  { value: "90d", label: "آخر 90 يومًا" },
  { value: "month", label: "هذا الشهر" },
  { value: "last_month", label: "الشهر الماضي" },
  { value: "custom", label: "مخصص" },
];

export const bucketKey = (date: string, grouping: "day" | "week" | "month") => {
  if (grouping === "month") return date.slice(0, 7);
  if (grouping === "week") {
    const d = new Date(`${date}T00:00:00.000Z`);
    const offset = (d.getUTCDay() + 6) % 7;
    return iso(new Date(d.getTime() - offset * DAY));
  }
  return date;
};

export function bucketLabel(key: string, grouping: "day" | "week" | "month") {
  if (grouping === "month") {
    return new Intl.DateTimeFormat("ar-EG", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
      new Date(`${key}-01T00:00:00.000Z`),
    );
  }
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${key}T00:00:00.000Z`),
  );
}

export function bucketsForRange(
  range: Pick<AnalyticsRange, "from" | "to">,
  grouping: "day" | "week" | "month",
): string[] {
  const keys: string[] = [];
  if (grouping === "month") {
    const start = new Date(`${range.from}T00:00:00.000Z`);
    const end = new Date(`${range.to}T00:00:00.000Z`);
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (d <= end) {
      keys.push(iso(d).slice(0, 7));
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return keys;
  }
  if (grouping === "week") {
    let cursor = bucketKey(range.from, "week");
    while (cursor <= range.to) {
      keys.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return keys;
  }
  let cursor = range.from;
  while (cursor <= range.to) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}
