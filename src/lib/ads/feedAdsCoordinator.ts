export type FeedAdsCoordinatorInput = {
  excludeCampaignIds: string[];
  excludeCreativeIds: string[];
};

export type FeedAdsCoordinatorSuccessInput = {
  campaignId?: string | null;
  creativeId?: string | null;
};

const excludeCampaignIdsSet = new Set<string>();
const excludeCreativeIdsSet = new Set<string>();

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getFeedAdsCoordinatorInput(): FeedAdsCoordinatorInput {
  return {
    excludeCampaignIds: Array.from(excludeCampaignIdsSet),
    excludeCreativeIds: Array.from(excludeCreativeIdsSet),
  };
}

export function rememberFeedAdSuccess(input: FeedAdsCoordinatorSuccessInput): void {
  const campaignId = normalizeId(input.campaignId);
  const creativeId = normalizeId(input.creativeId);

  if (campaignId) excludeCampaignIdsSet.add(campaignId);
  if (creativeId) excludeCreativeIdsSet.add(creativeId);
}

export function clearFeedAdsCoordinatorExcludes(): void {
  excludeCampaignIdsSet.clear();
  excludeCreativeIdsSet.clear();
}
