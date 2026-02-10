import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import FollowButton from "../../src/components/follow/FollowButton";
import { isUuid, useWebSession, useWhoami } from "../../src/lib/api";
import { useEffect, useState } from "react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  type: string | null;
  city: string | null;
  sport: string | null;
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

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await supabase
        .from("profiles")
        .select("id, full_name, display_name, avatar_url, account_type, type, city, sport")
        .eq("id", id)
        .maybeSingle();

      if (!mounted) return;
      setProfile(res.data ? (res.data as any) : null);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (web.loading || whoami.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
        <ActivityIndicator />
        <Text style={{ color: "#6b7280" }}>Caricamento…</Text>
      </View>
    );
  }

  if (!id) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Profilo non valido</Text>
        <Text style={{ color: "#6b7280" }}>
          Questo percorso richiede un UUID valido. (Regola vincolante)
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#111827",
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: "#111827" }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }} contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
        <Text style={{ fontWeight: "700", color: "#111827" }}>← Indietro</Text>
      </Pressable>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "900" }}>
          {profile?.full_name || profile?.display_name || "Club"}
        </Text>
        <Text style={{ color: "#6b7280" }}>{profile?.sport || ""}{profile?.city ? ` • ${profile.city}` : ""}</Text>
        <Text style={{ color: "#9ca3af", fontSize: 12 }}>{id}</Text>
      </View>

      {/* ✅ FollowButton appare SOLO se UUID valido (id è già UUID) */}
      <FollowButton targetProfileId={id} />

      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: "#6b7280" }}>Carico profilo…</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
