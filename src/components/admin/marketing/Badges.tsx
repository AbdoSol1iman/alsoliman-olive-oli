import {
  CAMPAIGN_STATUS_LABELS,
  DATA_SOURCE_LABELS,
  PLATFORM_LABELS,
  type CampaignStatus,
  type DataSource,
  type Platform,
} from "@/lib/marketing-types";
import { cx } from "@/lib/format";

const sourceTone: Record<DataSource, string> = {
  manual: "border-gold/40 bg-gold/10 text-forest",
  meta_api: "border-blue-800/20 bg-blue-50/60 text-blue-900",
  google_api: "border-emerald-800/20 bg-emerald-50/60 text-emerald-900",
  tiktok_api: "border-charcoal/20 bg-cream text-charcoal",
};

export function SourceBadge({ source }: { source: DataSource }) {
  return (
    <span
      className={cx(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.63rem]",
        sourceTone[source],
      )}
    >
      {DATA_SOURCE_LABELS[source]}
    </span>
  );
}

const statusTone: Record<CampaignStatus, string> = {
  active: "border-forest/30 bg-sage/20 text-forest",
  paused: "border-gold/50 bg-gold/15 text-forest",
  ended: "border-charcoal/20 bg-cream text-ink-muted",
  draft: "border-charcoal/15 bg-ivory text-ink-muted",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cx(
        "inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.66rem]",
        statusTone[status],
      )}
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}

export function PlatformLabel({ platform }: { platform: Platform }) {
  return <span className="whitespace-nowrap text-[0.75rem]">{PLATFORM_LABELS[platform]}</span>;
}

/** A value that may be unavailable — never renders a fake zero. */
export function MaybeValue({
  value,
  children,
}: {
  value: number | null;
  children: React.ReactNode;
}) {
  if (value === null) return <span className="text-[0.7rem] text-ink-muted">غير متاح</span>;
  return <>{children}</>;
}
