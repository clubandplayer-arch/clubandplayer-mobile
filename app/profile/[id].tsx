import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { resolveProfileByAuthorId, type Profile } from "../../src/lib/profiles/resolveProfile";
import { getFollowSocialForProfile, type FollowSocial } from "../../src/lib/social/getFollowSocial";
import { isCertifiedClub } from "../../src/lib/profiles/certification";

function buildDisplayName(p: Profile | null) {
  const a = (p?.full_name ?? "").trim();
  const b = (p?.display_name ?? "").trim();
  return a || b || "Utente";
}

function buildLocation(p: Profile | null) {
  const parts = [p?.city, p?.province, p?.region, p?.country]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" • ") : "—";
}

function buildTagline(p: Profile | null) {
  const parts = [p?.sport, p?.role].map((v) => (v ?? "").trim()).filter(Boolean);
  return parts.length ? parts.join(" • ") : "—";
}

export default function ProfileByIdScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const profileKey = (params.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followSocial, setFollowSocial] = useState<FollowSocial | null>(null);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [viewerProfileId, setViewerProfileId] = useState<string | null>(null);

  const title = useMemo(() => buildDisplayName(profile), [profile]);

  const load = useCallback(async () => {
    setError(null);
    setFollowSocial(null);

    if (!profileKey) {
      setProfile(null);
      setError("Profilo non valido.");
      setLoading(false);
      return;
    }

    try {
      const { data: auth } = await supabase.auth.getUser();
      const viewerId = auth.user?.id ?? null;
      setViewerUserId(viewerId);
      setViewerProfileId(null);

      if (viewerId) {
        const viewerProfile = await resolveProfileByAuthorId(viewerId, supabase);
        setViewerProfileId(viewerProfile?.id ?? null);
      }

      const found = await resolveProfileByAuthorId(profileKey, supabase);

      if (!found) {
        setProfile(null);
        setError("Profilo non trovato.");
      } else {
        setProfile(found);
      }

      const followData = await getFollowSocialForProfile({
        viewerUserId: viewerId,
        profileKey,
        supabase,
      });
      setFollowSocial(followData);
    } catch (e: any) {
      setProfile(null);
      setError(e?.message ? String(e.message) : "Errore nel caricamento profilo");
    } finally {
      setLoading(false);
    }
  }, [profileKey]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const Avatar = () => {
    if (profile?.avatar_url) {
      return (
        <Image
          source={{ uri: profile.avatar_url }}
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            backgroundColor: "#e5e7eb",
          }}
        />
      );
    }
    const letter = (title.slice(0, 1) || "U").toUpperCase();
    return (
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 999,
          backgroundColor: "#e5e7eb",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "900" }}>{letter}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 10,
          }}
        >
          <Text style={{ fontWeight: "800" }}>←</Text>
        </Pressable>

        <Text style={{ fontSize: 20, fontWeight: "900" }} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {error ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#fecaca",
            backgroundColor: "#fff5f5",
            borderRadius: 12,
            padding: 14,
            gap: 8,
          }}
        >
          <Text style={{ fontWeight: "900", color: "#b91c1c" }}>Errore</Text>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={{ alignSelf: "flex-start" }}
          >
            <Text style={{ color: "#036f9a", fontWeight: "900" }}>Riprova</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && profile ? (
        <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 18, fontWeight: "900" }}>{title}</Text>
                {isCertifiedClub({
                  account_type: profile.account_type,
                  type: profile.type,
                  role: profile.role,
                  verified_until: profile.verified_until,
                  certified: profile.certified,
                  certification_status: profile.certification_status,
                }) ? <Text style={{ fontSize: 12, fontWeight: "900", color: "#111827" }}>C</Text> : null}
              </View>
              <Text style={{ color: "#374151" }}>{buildTagline(profile)}</Text>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                {buildLocation(profile)}
              </Text>
            </View>
          </View>

          {followSocial?.discoveryStatus === "discovery_failed" ? (
            <Text style={{ color: "#6b7280" }}>Statistiche non disponibili</Text>
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#111827", fontWeight: "700" }}>
                Follower: {followSocial?.followerCount ?? 0}
              </Text>
              <Text style={{ color: "#111827", fontWeight: "700" }}>
                Seguiti: {followSocial?.followingCount ?? 0}
              </Text>
            </View>
          )}

          {profile.user_id === viewerUserId ||
          profile.id === viewerProfileId ||
          profileKey === viewerUserId ? null : (
            <Pressable
              onPress={() => {
                if (!viewerUserId) {
                  router.replace("/(auth)/login");
                  return;
                }
                Alert.alert("Segui", "Funzione in arrivo");
              }}
              style={{
                alignSelf: "flex-start",
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: followSocial?.isFollowing ? "#0A66C2" : "#111827",
                backgroundColor: followSocial?.isFollowing ? "#0A66C2" : "transparent",
              }}
            >
              <Text
                style={{
                  fontWeight: "800",
                  color: followSocial?.isFollowing ? "#ffffff" : "#111827",
                }}
              >
                {followSocial?.isFollowing ? "Seguito" : "Segui"}
              </Text>
            </Pressable>
          )}

          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "800" }}>Bio</Text>
            <Text style={{ color: "#374151" }}>
              {profile.bio && profile.bio.trim().length > 0
                ? profile.bio
                : "Nessuna bio disponibile."}
            </Text>
          </View>

          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            type: {(profile.account_type ?? profile.type ?? "—").toString()}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
