import {
  CAMPAIGN_STATUSES,
  DATA_SOURCES,
  PLATFORMS,
  type CampaignStatus,
  type DataSource,
  type Platform,
} from "./marketing-types";

export const isPlatform = (value: string): value is Platform =>
  (PLATFORMS as readonly string[]).includes(value);

export const isCampaignStatus = (value: string): value is CampaignStatus =>
  (CAMPAIGN_STATUSES as readonly string[]).includes(value);

export const isDataSource = (value: string): value is DataSource =>
  (DATA_SOURCES as readonly string[]).includes(value);
