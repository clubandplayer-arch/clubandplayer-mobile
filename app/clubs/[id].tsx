import { useMemo, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { isUuid, useWebSession, useWhoami } from "../../src/lib/api";
import { getFeedPosts, type FeedPost } from "../../src/lib/feed/getFeedPosts";
import FeedCard from "../../src/components/feed/FeedCard";
import { getProfileDisplayName } from "../../src/lib/profiles/getProfileDisplayName";
import PublicProfileHeader, { type PublicProfileLinks } from "../../src/components/profiles/PublicProfileHeader";
import { isCertifiedClub } from "../../src/lib/profiles/certification";
import { theme } from "../../src/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileRow = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  type?: string | null;
  city?: string | null;
  country?: string | null;
  club_country?: string | null;
  sport?: string | null;
  category?: string | null;
  level?: string | null;
  club_league_category?: string | null;
  club_category?: string | null;
  bio?: string | null;
  description?: string | null;
  facility_name?: string | null;
  facility_address?: string | null;
  address?: string | null;
  club_stadium?: string | null;
  club_stadium_address?: string | null;
  region?: string | null;
  province?: string | null;
  links?: PublicProfileLinks | unknown;
  club_motto?: string | null;
  club_foundation_year?: number | null;
  is_certified?: boolean | null;
  certified?: boolean | null;
  certification?: string | boolean | null;
  verified?: boolean | null;
  is_verified?: boolean | null;
  verified_until?: string | null;
  certification_status?: string | null;
  [key: string]: unknown;
};

type OpportunityRow = {
  id: string;
  title?: string | null;
  role?: string | null;
  sport?: string | null;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  country?: string | null;
  created_at?: string | null;
  status?: string | null;
  category?: string | null;
};

type ClubRosterMemberRow = {
  club_profile_id: string;
  player_profile_id: string;
  status: string | null;
  created_at: string | null;
  club_sport: string | null;
};

type PlayerMiniProfileRow = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  sport?: string | null;
  role?: string | null;
  city?: string | null;
  country?: string | null;
};

const getTextValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};


function getNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getLinks(value: unknown): PublicProfileLinks {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const pick = (key: "instagram" | "facebook" | "tiktok" | "x") => {
    const raw = obj[key];
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
  };

  const links = { instagram: pick("instagram"), facebook: pick("facebook"), tiktok: pick("tiktok"), x: pick("x") };
  return Object.values(links).some(Boolean) ? links : null;
}

export default function ClubProfileScreen() {
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
  const [opps, setOpps] = useState<OpportunityRow[]>([]);
  const [oppsLoading, setOppsLoading] = useState(false);
  const [roster, setRoster] = useState<ClubRosterMemberRow[]>([]);
  const [rosterPlayers, setRosterPlayers] = useState<Record<string, PlayerMiniProfileRow>>({});
  const [rosterLoading, setRosterLoading] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [verifiedFromView, setVerifiedFromView] = useState<boolean>(false);
  const isLoading = loading || web.loading || whoami.loading;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();

      if (!mounted) return;
      setProfile(res.data ? (res.data as ProfileRow) : null);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const loadVerification = async () => {
      if (!id) {
        setVerifiedFromView(false);
        return;
      }

      const result = await supabase
        .from("club_verification_requests_view")
        .select("is_verified")
        .eq("club_id", id)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (!mounted) return;

      if (result.error || !Array.isArray(result.data)) {
        setVerifiedFromView(false);
        return;
      }

      const hasVerifiedRow = result.data.some((row) => Boolean((row as any)?.is_verified));
      setVerifiedFromView(hasVerifiedRow);
    };

    void loadVerification();

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
        if (__DEV__) console.log("[clubs] wall posts load error", error);
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

  useEffect(() => {
    let mounted = true;

    const loadRoster = async () => {
      if (!id) {
        setRoster([]);
        setRosterPlayers({});
        setRosterLoading(false);
        return;
      }

      setRosterLoading(true);
      const res = await supabase
        .from("club_roster_members")
        .select("club_profile_id,player_profile_id,status,created_at,club_sport")
        .eq("club_profile_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (res.error) {
        if (__DEV__) console.log("[clubs] roster load error", res.error.message);
        setRoster([]);
        setRosterPlayers({});
        setRosterLoading(false);
        return;
      }

      const items = (res.data ?? []) as ClubRosterMemberRow[];
      setRoster(items);

      const playerIds = Array.from(new Set(items.map((x) => x.player_profile_id).filter(Boolean)));

      if (playerIds.length === 0) {
        setRosterPlayers({});
        setRosterLoading(false);
        return;
      }

      const resProfiles = await supabase
        .from("profiles")
        .select("id,full_name,display_name,avatar_url,sport,role,city,country")
        .in("id", playerIds);

      if (!mounted) return;

      if (resProfiles.error) {
        if (__DEV__) console.log("[clubs] roster profiles load error", resProfiles.error.message);
        setRosterPlayers({});
        setRosterLoading(false);
        return;
      }

      const map: Record<string, PlayerMiniProfileRow> = {};
      for (const p of (resProfiles.data ?? []) as PlayerMiniProfileRow[]) {
        map[p.id] = p;
      }
      setRosterPlayers(map);
      setRosterLoading(false);
    };

    void loadRoster();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const loadOpportunities = async () => {
      if (!id) {
        setOpps([]);
        setOppsLoading(false);
        return;
      }

      setOppsLoading(true);
      const res = await supabase
        .from("opportunities")
        .select("id,title,role,sport,city,province,region,country,created_at,status,category")
        .eq("club_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!mounted) return;
      if (res.error) {
        if (__DEV__) console.log("[clubs] opportunities load error", res.error.message);
        setOpps([]);
        setOppsLoading(false);
        return;
      }

      setOpps((res.data ?? []) as OpportunityRow[]);
      setOppsLoading(false);
    };

    void loadOpportunities();

    return () => {
      mounted = false;
    };
  }, [id]);

  const displayName = isLoading ? "Caricamento…" : getProfileDisplayName({ ...(profile ?? {}), account_type: "club" });
  const avatarUrl = getTextValue(profile?.avatar_url);
  const sport = getTextValue(profile?.sport);
  const category =
    getTextValue(profile?.club_league_category) ||
    getTextValue(profile?.club_category) ||
    getTextValue(profile?.category) ||
    getTextValue(profile?.level);
  const city = getTextValue(profile?.city);
  const province = getTextValue(profile?.province);
  const region = getTextValue(profile?.region);
  const clubCountry = getTextValue(profile?.club_country) || getTextValue(profile?.country);
  const location = [city, province, region, clubCountry].filter(Boolean).join(" • ") || "—";
  const stadium = getTextValue(profile?.club_stadium);
  const stadiumAddress = getTextValue(profile?.club_stadium_address);
  const facility = [stadium, stadiumAddress].filter(Boolean).join(" • ") || "—";
  const biography = getTextValue(profile?.bio) || getTextValue(profile?.description) || "—";
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

  const isCertified = isCertifiedClub({
    account_type: profile?.account_type,
    type: profile?.type,
    role: "club",
    is_verified:
      verifiedFromView ||
      profile?.is_verified === true ||
      profile?.is_certified === true ||
      profile?.verified === true,
    certified: profile?.certified,
    verified_until: typeof profile?.verified_until === "string" ? profile.verified_until : null,
    certification_status: typeof profile?.certification_status === "string" ? profile.certification_status : null,
  });

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
        accountType="club"
        avatarUrl={avatarUrl}
        subtitle={[category, sport].filter(Boolean).join(" • ") || "—"}
        locationContent={
          <View style={{ gap: 4 }}>
            <Text style={{ color: location !== "—" ? theme.colors.muted : "#9ca3af", fontSize: 12 }}>{location !== "—" ? location : "Località —"}</Text>
            {getTextValue(profile?.club_motto) ? (
              <Text style={{ color: theme.colors.text, fontStyle: "italic" }}>“{getTextValue(profile?.club_motto)}”</Text>
            ) : null}
            {getNumberValue(profile?.club_foundation_year) ? (
              <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "600" }}>
                Anno di fondazione: {getNumberValue(profile?.club_foundation_year)}
              </Text>
            ) : null}
          </View>
        }
        socialLinks={getLinks(profile?.links)}
        showMessageButton={!isMe}
        showFollowButton={!isMe}
        isVerified={isCertified}
      />

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          gap: 14,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Dati club</Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Sede</Text>
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{location}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Sport principale</Text>
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{sport || "—"}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Tipologia / Categoria</Text>
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{category || "—"}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Impianto sportivo</Text>
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{facility}</Text>
          </View>
        </View>
      </View>

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
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Biografia</Text>
        <Text style={{ color: theme.colors.text, lineHeight: 20 }}>{biography}</Text>
      </View>

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
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>
          Opportunità aperte
        </Text>

        {oppsLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: theme.colors.muted }}>Carico opportunità…</Text>
          </View>
        ) : null}

        {!oppsLoading && opps.length === 0 ? (
          <Text style={{ color: theme.colors.muted }}>Nessuna opportunità aperta</Text>
        ) : null}

        {!oppsLoading && opps.length > 0
          ? opps.map((opp) => {
              const title = getTextValue(opp.title) || getTextValue(opp.role) || "Opportunità";
              const oppLocation =
                [opp.city, opp.province, opp.region, opp.country]
                  .map((value) => getTextValue(value))
                  .filter(Boolean)
                  .join(" • ") || "—";
              const oppMeta = [getTextValue(opp.category), getTextValue(opp.sport)]
                .filter(Boolean)
                .join(" • ");
              const publishedDate = getTextValue(opp.created_at)?.slice(0, 10) || "—";
              const status = getTextValue(opp.status) || "—";

              return (
                <Pressable
                  key={opp.id}
                  onPress={() => router.push(`/opportunities/${opp.id}`)}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neutral200,
                    borderRadius: 10,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{title}</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{oppLocation}</Text>
                  {oppMeta ? <Text style={{ color: theme.colors.text, fontSize: 12 }}>{oppMeta}</Text> : null}
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    Pubblicato il {publishedDate}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Stato: {status}</Text>
                </Pressable>
              );
            })
          : null}
      </View>

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
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Rosa</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Giocatori in rosa</Text>

        {rosterLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: theme.colors.muted }}>Carico rosa…</Text>
          </View>
        ) : null}

        {!rosterLoading && roster.length === 0 ? (
          <Text style={{ color: theme.colors.muted }}>Nessun giocatore in rosa</Text>
        ) : null}

        {!rosterLoading && roster.length > 0
          ? roster.map((member) => {
              const player = rosterPlayers[member.player_profile_id];
              const playerName = getProfileDisplayName({ ...(player ?? {}), account_type: "athlete" });
              const playerAvatarUrl = getTextValue(player?.avatar_url);
              const playerMeta = [player?.role, player?.sport, player?.country]
                .map((value) => getTextValue(value))
                .filter(Boolean)
                .join(" • ");

              return (
                <Pressable
                  key={`${member.player_profile_id}-${member.created_at ?? "na"}`}
                  onPress={() => router.push(`/players/${member.player_profile_id}`)}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neutral200,
                    borderRadius: 10,
                    padding: 12,
                    gap: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {playerAvatarUrl ? (
                    <Image
                      source={{ uri: playerAvatarUrl }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.colors.neutral200,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.colors.neutral200,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "800", color: theme.colors.muted }}>
                        {playerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{playerName}</Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{playerMeta || "—"}</Text>
                  </View>
                </Pressable>
              );
            })
          : null}
      </View>

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

      {isLoading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: theme.colors.muted }}>Caricamento…</Text>
        </View>
      ) : null}

      <View style={{ height: 16 + (insets.bottom || 0) }} />
      </ScrollView>
    </SafeAreaView>
  );
}
