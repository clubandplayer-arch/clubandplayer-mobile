import { useMemo, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import FollowButton from "../../src/components/follow/FollowButton";
import { isUuid, useWebSession, useWhoami } from "../../src/lib/api";
import { theme } from "../../src/theme";

type ProfileRow = {
  id: string;
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
  is_certified?: boolean | null;
  certified?: boolean | null;
  certification?: string | boolean | null;
  verified?: boolean | null;
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

const getTextValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export default function ClubProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

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

  const displayName =
    getTextValue(profile?.full_name) || getTextValue(profile?.display_name) || "Club";
  const avatarUrl = getTextValue(profile?.avatar_url);
  const sport = getTextValue(profile?.sport);
  const category =
    getTextValue(profile?.club_league_category) ||
    getTextValue(profile?.club_category) ||
    getTextValue(profile?.category) ||
    getTextValue(profile?.level);
  const city = getTextValue(profile?.city);
  const clubCountry = getTextValue(profile?.club_country) || getTextValue(profile?.country);
  const location = [clubCountry, city].filter(Boolean).join(" / ") || "—";
  const stadium = getTextValue(profile?.club_stadium);
  const stadiumAddress = getTextValue(profile?.club_stadium_address);
  const facility = [stadium, stadiumAddress].filter(Boolean).join(" • ") || "—";
  const biography = getTextValue(profile?.bio) || getTextValue(profile?.description) || "—";

  const isCertified =
    profile?.is_certified === true ||
    profile?.certified === true ||
    profile?.verified === true ||
    profile?.certification === true ||
    (typeof profile?.certification === "string" && profile.certification.trim().length > 0);

  if (web.loading || whoami.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted }}>Caricamento…</Text>
      </View>
    );
  }

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
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
        <Text style={{ fontWeight: "700", color: theme.colors.text }}>← Indietro</Text>
      </Pressable>

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
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.neutral200 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.colors.neutral200,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "800", color: theme.colors.muted, fontSize: 20 }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: theme.colors.text, flexShrink: 1 }}>
                {displayName}
              </Text>
              {isCertified ? (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: theme.colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>C</Text>
                </View>
              ) : null}
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: theme.colors.neutral200,
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "700" }}>Club</Text>
              </View>
            </View>
            <Text style={{ color: theme.colors.muted }}>
              {[category, sport].filter(Boolean).join(" • ") || "—"}
            </Text>
            <Text style={{ color: theme.colors.muted }}>{location}</Text>
          </View>
        </View>

        <View style={{ alignSelf: "flex-start" }}>
          <FollowButton targetProfileId={id} />
        </View>
      </View>

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

      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: theme.colors.muted }}>Carico profilo…</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
