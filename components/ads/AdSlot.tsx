import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import Constants from "expo-constants";

import { apiFetch } from "../../src/lib/api";
import {
  clearFeedAdsCoordinatorExcludes,
  getFeedAdsCoordinatorInput,
  rememberFeedAdSuccess,
} from "../../src/lib/ads/feedAdsCoordinator";

type AdSlotProps = {
  slot: "feed_infeed";
  page: "feed";
};

type AdsServeBody = {
  slot: string;
  page: string;
  debug?: boolean;
  excludeCampaignIds?: string[];
  excludeCreativeIds?: string[];
  exclude_campaign_ids?: string[];
  exclude_creative_ids?: string[];
};

type AdsServeResponse = {
  ok?: boolean;
  creative?: unknown;
};

type AdCreative = {
  creativeId: string;
  campaignId: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaText: string;
  targetUrl: string;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCreative(input: unknown): AdCreative | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;

  const creativeId = normalizeString(row.creativeId ?? row.creative_id ?? row.id);
  const campaignId = normalizeString(row.campaignId ?? row.campaign_id);
  const targetUrl = normalizeString(row.targetUrl ?? row.target_url);

  if (!creativeId || !campaignId || !targetUrl) return null;

  const title = normalizeString(row.title ?? row.headline);
  const body = normalizeString(row.body ?? row.description);
  const imageUrl = normalizeString(row.imageUrl ?? row.image_url ?? row.image);
  const ctaText = normalizeString(row.ctaText ?? row.cta_text ?? row.ctaLabel) ?? "Scopri di più";

  return {
    creativeId,
    campaignId,
    title,
    body,
    imageUrl,
    ctaText,
    targetUrl,
  };
}

function isAdsEnabled(): boolean {
  const extra =
    (Constants.expoConfig as any)?.extra ??
    (Constants.manifest as any)?.extra ??
    {};

  const raw =
    process.env.NEXT_PUBLIC_ADS_ENABLED ??
    extra.NEXT_PUBLIC_ADS_ENABLED ??
    extra.adsEnabled ??
    "false";

  return String(raw).toLowerCase() === "true";
}

async function serveFeedAd(slot: string, page: string, withExclude: boolean): Promise<AdCreative | null> {
  const coordinatorInput = withExclude
    ? getFeedAdsCoordinatorInput()
    : { excludeCampaignIds: [], excludeCreativeIds: [] };

  const payload: AdsServeBody = {
    slot,
    page,
    excludeCampaignIds: coordinatorInput.excludeCampaignIds,
    excludeCreativeIds: coordinatorInput.excludeCreativeIds,
    exclude_campaign_ids: coordinatorInput.excludeCampaignIds,
    exclude_creative_ids: coordinatorInput.excludeCreativeIds,
  };

  const response = await apiFetch<AdsServeResponse>("/api/ads/serve", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) return null;

  return normalizeCreative(response.data?.creative ?? null);
}

export default function AdSlot({ slot, page }: AdSlotProps) {
  const adsEnabled = useMemo(() => isAdsEnabled(), []);
  const [creative, setCreative] = useState<AdCreative | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!adsEnabled) {
        setCreative(null);
        return;
      }

      const firstAttempt = await serveFeedAd(slot, page, true);
      if (cancelled) return;

      if (firstAttempt) {
        rememberFeedAdSuccess({
          creativeId: firstAttempt.creativeId,
          campaignId: firstAttempt.campaignId,
        });
        setCreative(firstAttempt);
        return;
      }

      clearFeedAdsCoordinatorExcludes();

      const retryWithoutExclude = await serveFeedAd(slot, page, false);
      if (cancelled) return;

      if (retryWithoutExclude) {
        rememberFeedAdSuccess({
          creativeId: retryWithoutExclude.creativeId,
          campaignId: retryWithoutExclude.campaignId,
        });
        setCreative(retryWithoutExclude);
        return;
      }

      setCreative(null);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [adsEnabled, page, slot]);

  if (!adsEnabled || !creative) return null;

  const onPressCta = async () => {
    await Linking.openURL(creative.targetUrl);

    await apiFetch("/api/ads/click", {
      method: "POST",
      body: JSON.stringify({
        creativeId: creative.creativeId,
        campaignId: creative.campaignId,
        slot,
        page,
      }),
    });
  };

  return (
    <View
      style={{
        marginHorizontal: 24,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      {creative.imageUrl ? (
        <Image
          source={{ uri: creative.imageUrl }}
          resizeMode="cover"
          style={{ width: "100%", height: 180, backgroundColor: "#f3f4f6" }}
        />
      ) : null}

      <View style={{ padding: 14, gap: 8 }}>
        {creative.title ? (
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>{creative.title}</Text>
        ) : null}

        {creative.body ? <Text style={{ fontSize: 14, color: "#374151" }}>{creative.body}</Text> : null}

        <Pressable
          onPress={() => {
            void onPressCta();
          }}
          style={{
            marginTop: 4,
            alignSelf: "flex-start",
            borderRadius: 10,
            backgroundColor: "#111827",
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>{creative.ctaText}</Text>
        </Pressable>
      </View>
    </View>
  );
}
