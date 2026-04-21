import { useMemo, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { isUuid, useWebSession, useWhoami } from "../../src/lib/api";
import { getFeedPosts, type FeedPost } from "../../src/lib/feed/getFeedPosts";
import FeedCard from "../../src/components/feed/FeedCard";
import { getProfileDisplayName } from "../../src/lib/profiles/getProfileDisplayName";
import PublicProfileHeader, { type PublicProfileLinks } from "../../src/components/profiles/PublicProfileHeader";
import AthleteExperiencesSection from "../../src/components/profiles/AthleteExperiencesSection";
import CountryFlag from "../../src/components/ui/CountryFlag";
import { resolveItalianLocationLabels } from "../../src/lib/geo/location";
import { getCountryDisplay } from "../../src/lib/geo/countryDisplay";
import { theme } from "../../src/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileRow = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  sport?: string | null;
  role?: string | null;
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null;
  interest_city?: string | null;
  interest_province?: string | null;
  interest_region?: string | null;
  interest_country?: string | null;
  interest_region_id?: number | null;
  interest_province_id?: number | null;
  interest_municipality_id?: number | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  links?: PublicProfileLinks | unknown;
  bio?: string | null;
  [key: string]: unknown;
};

type AthleteExperience = {
  id: string;
  club_name: string | null;
  sport: string | null;
  role: string | null;
  category: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean | null;
  description: string | null;
};

const getTextValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};


function getLinks(value: unknown): PublicProfileLinks {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const pick = (key: "instagram" | "facebook" | "tiktok" | "x") => {
    const raw = obj[key];
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  };

  const links = {
    instagram: pick("instagram"),
    facebook: pick("facebook"),
    tiktok: pick("tiktok"),
    x: pick("x"),
  };

  return Object.values(links).some(Boolean) ? links : null;
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const insets = useSafeAreaInsets();

  const id = useMemo(() => {
    const raw = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
    if (!raw) return null;
    const v = String(raw).trim();
    return isUuid(v) ? v : null;
  }, [params.id]);

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [experiences, setExperiences] = useState<AthleteExperience[]>([]);
  const [resolvedLocation, setResolvedLocation] = useState<{ country: string | null; region: string | null; province: string | null; city: string | null } | null>(null);
  const isLoading = loading || web.loading || whoami.loading;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setProfile(null);
        setResolvedLocation(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();

      if (!mounted) return;

      const nextProfile = res.data ? (res.data as ProfileRow) : null;
      setProfile(nextProfile);

      if (!nextProfile) {
        setExperiences([]);
        setResolvedLocation(null);
        setLoading(false);
        return;
      }

      try {
        const experiencesRes = await supabase
          .from("athlete_experiences")
          .select("id, club_name, sport, role, category, start_year, end_year, is_current, description")
          .eq("profile_id", nextProfile.id);
        if (experiencesRes.error) setExperiences([]);
        else setExperiences((experiencesRes.data ?? []) as AthleteExperience[]);

        const labels = await resolveItalianLocationLabels({
          country: getTextValue(nextProfile.interest_country) ?? getTextValue(nextProfile.country),
          regionId: getNumberValue(nextProfile.interest_region_id),
          provinceId: getNumberValue(nextProfile.interest_province_id),
          municipalityId: getNumberValue(nextProfile.interest_municipality_id),
          regionLabel: getTextValue(nextProfile.interest_region) ?? getTextValue(nextProfile.region),
          provinceLabel: getTextValue(nextProfile.interest_province) ?? getTextValue(nextProfile.province),
          cityLabel: getTextValue(nextProfile.interest_city) ?? getTextValue(nextProfile.city),
        });

        if (!mounted) return;

        setResolvedLocation({
          country: getTextValue(nextProfile.interest_country) ?? getTextValue(nextProfile.country),
          region: labels.region ?? getTextValue(nextProfile.interest_region) ?? getTextValue(nextProfile.region),
          province: labels.province ?? getTextValue(nextProfile.interest_province) ?? getTextValue(nextProfile.province),
          city: labels.city ?? getTextValue(nextProfile.interest_city) ?? getTextValue(nextProfile.city),
        });
      } catch {
        if (!mounted) return;
        setExperiences([]);
        setResolvedLocation({
          country: getTextValue(nextProfile.interest_country) ?? getTextValue(nextProfile.country),
          region: getTextValue(nextProfile.interest_region) ?? getTextValue(nextProfile.region),
          province: getTextValue(nextProfile.interest_province) ?? getTextValue(nextProfile.province),
          city: getTextValue(nextProfile.interest_city) ?? getTextValue(nextProfile.city),
        });
      }

      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const loadWallPosts = async () => {
      if (!id) {
        setPosts([]);
        setPostsLoading(false);
        return;
      }

      setPostsLoading(true);
      try {
        const res = await getFeedPosts({ scope: "all" });
        if (!mounted) return;

        const filtered = res.items
          .filter((item) => {
            const raw = item.raw ?? {};
            const authorCandidates = [
              raw?.author_profile_id,
              raw?.authorId,
              raw?.author_id,
              raw?.author_profile?.id,
              item.author_id,
            ];
            return authorCandidates.some((candidate) =>
              typeof candidate === "string" ? candidate.trim() === id : false,
            );
          })
          .slice(0, 10);

        setPosts(filtered);
      } catch (error) {
        if (__DEV__) console.log("[players] wall posts load error", error);
        if (!mounted) return;
        setPosts([]);
      } finally {
        if (mounted) setPostsLoading(false);
      }
    };

    void loadWallPosts();

    return () => {
      mounted = false;
    };
  }, [id]);

  const displayName = isLoading ? "Caricamento…" : getProfileDisplayName({ ...(profile ?? {}), account_type: "athlete" });
  const avatarUrl = getTextValue(profile?.avatar_url);
  const sport = getTextValue(profile?.sport);
  const role = getTextValue(profile?.role);
  const sportRole = [sport, role].filter(Boolean).join(" • ") || "—";

  const countryRaw =
    getTextValue(resolvedLocation?.country) ??
    getTextValue(profile?.interest_country) ??
    getTextValue(profile?.country) ??
    "";
  const countryInfo = getCountryDisplay(countryRaw);
  const nationality = countryInfo.label || "—";
  const birthYear = getNumberValue(profile?.birth_year);
  const currentYear = new Date().getFullYear();
  const age = birthYear ? String(currentYear - birthYear) : "—";

  const heightCm = getNumberValue(profile?.height_cm);
  const weightKg = getNumberValue(profile?.weight_kg);
  const height = heightCm ? `${heightCm} cm` : "—";
  const weight = weightKg ? `${weightKg} kg` : "—";
  const foot = getTextValue(profile?.foot) || "—";

  const interestParts = [
    getTextValue(resolvedLocation?.city) ?? getTextValue(profile?.interest_city) ?? getTextValue(profile?.city),
    getTextValue(resolvedLocation?.province) ?? getTextValue(profile?.interest_province) ?? getTextValue(profile?.province),
    getTextValue(resolvedLocation?.region) ?? getTextValue(profile?.interest_region) ?? getTextValue(profile?.region),
    getTextValue(resolvedLocation?.country) ?? getTextValue(profile?.interest_country) ?? getTextValue(profile?.country),
  ].filter(Boolean) as string[];
  const interestLocation = interestParts.join(" • ") || "—";

  const biography = getTextValue(profile?.bio) || "—";
  const viewerProfileId =
    whoami.data?.profile && typeof whoami.data.profile === "object"
      ? getTextValue((whoami.data.profile as Record<string, unknown>).id)
      : null;
  const viewerUserId =
    whoami.data?.user && typeof whoami.data.user === "object"
      ? getTextValue((whoami.data.user as Record<string, unknown>).id)
      : null;
  const profileUserId = getTextValue(profile?.user_id);
  const isMe = Boolean(
    id &&
      ((viewerProfileId && viewerProfileId === id) ||
        (viewerUserId && (viewerUserId === id || (profileUserId && viewerUserId === profileUserId)))),
  );

  if (!id) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Profilo non valido</Text>
        <Text style={{ color: theme.colors.muted }}>Questo percorso richiede un UUID valido.</Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          gap: 16,
          paddingBottom: 16,
        }}
        scrollIndicatorInsets={{ bottom: 16 + (insets.bottom || 0) }}
      >

      <PublicProfileHeader
        profileId={id}
        displayName={displayName}
        accountType="player"
        avatarUrl={avatarUrl}
        subtitle={sportRole}
        locationLabel={interestLocation}
        socialLinks={getLinks(profile?.links)}
        showMessageButton={!isMe}
        showFollowButton={!isMe}
      />
      {countryInfo.label ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -6 }}>
          <CountryFlag iso2={countryInfo.iso2} />
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{countryInfo.label}</Text>
        </View>
      ) : null}

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Dati player</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14, columnGap: 12 }}>
          {[
            { label: "Età", value: age },
            { label: "Altezza", value: height },
            { label: "Peso", value: weight },
            { label: "Piede", value: foot },
            { label: "Sport", value: sport || "—" },
            { label: "Ruolo", value: role || "—" },
            { label: "Nazionalità", value: nationality, countryIso2: countryInfo.iso2 },
            { label: "Zona di interesse", value: interestLocation },
          ].map((item) => (
            <View key={item.label} style={{ width: "48%", gap: 4 }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted }}>{item.label}</Text>
              {item.label === "Nazionalità" ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <CountryFlag iso2={(item as { countryIso2?: string | null }).countryIso2} />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>{item.value}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.text }}>{item.value}</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Biografia</Text>
        <Text style={{ color: theme.colors.text, lineHeight: 22 }}>{biography}</Text>
      </View>

      <AthleteExperiencesSection experiences={experiences} />

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Bacheca</Text>

        {postsLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: theme.colors.muted }}>Carico post…</Text>
          </View>
        ) : null}

        {!postsLoading && posts.length === 0 ? (
          <Text style={{ color: theme.colors.muted }}>Nessun post pubblicato</Text>
        ) : null}

        {!postsLoading && posts.length > 0
          ? posts.map((post) => {
              return <FeedCard key={post.id} item={post} />;
            })
          : null}
      </View>

      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: theme.colors.muted }}>Carico profilo…</Text>
        </View>
      ) : null}
      <View style={{ height: 16 + (insets.bottom || 0) }} />
      </ScrollView>
    </SafeAreaView>
  );
}
