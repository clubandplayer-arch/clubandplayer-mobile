import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
  Image,
} from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";
import {
  resolveProfileByAuthorIdDetailed,
  type Profile,
} from "../../../src/lib/profiles/resolveProfile";

function buildDisplayName(p: Profile | null) {
  if (!p) return "—";
  const a = (p.full_name ?? "").trim();
  const b = (p.display_name ?? "").trim();
  return a || b || "—";
}

function buildLocation(p: Profile | null) {
  if (!p) return "—";
  const parts = [p.city, p.province, p.region, p.country]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(" • ") : "—";
}

function buildTagline(p: Profile | null) {
  if (!p) return "—";
  const parts = [p.sport, p.role].map((v) => (v ?? "").trim()).filter(Boolean);
  return parts.length ? parts.join(" • ") : "—";
}

export default function MeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "loading" | "found" | "missing" | "error"
  >("idle");

  const appVersionLabel = useMemo(() => {
    const v = (Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "unknown").toString();
    const b = (Constants.nativeBuildVersion ??
      Constants.expoConfig?.android?.versionCode ??
      "unknown").toString();
    return `v${v} (${Platform.OS} ${b})`;
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileStatus("loading");

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user ?? null;

    setAuthEmail(user?.email ?? null);

    if (!user?.id) {
      setProfile(null);
      setProfileStatus("missing");
      return;
    }

    const { profile: resolved, error } = await resolveProfileByAuthorIdDetailed(
      user.id,
      supabase,
    );

    if (error) {
      setProfile(null);
      setProfileStatus("error");
      return;
    }

    if (!resolved) {
      setProfile(null);
      setProfileStatus("missing");
      return;
    }

    setProfile(resolved);
    setProfileStatus("found");
  }, []);

  const load = useCallback(async () => {
    try {
      await loadProfile();
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const onLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Errore", "Logout fallito");
        return;
      }
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Errore", "Logout fallito");
    }
  };

  const onOpenWebProfile = async () => {
    const url = "https://www.clubandplayer.com/profile";
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert("Link", "Non riesco ad aprire il link.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Link", "Non riesco ad aprire il link.");
    }
  };

  const onFeedback = async () => {
    const to = "support@clubandplayer.com";
    const subject = encodeURIComponent(
      `Feedback Club & Player Mobile — ${appVersionLabel}`
    );
    const body = encodeURIComponent(
      [
        `Versione: ${appVersionLabel}`,
        authEmail ? `Account: ${authEmail}` : "Account: (non loggato)",
        profile ? `ProfileId: ${profile.id}` : "ProfileId: (missing)",
        "",
        "Cosa stavi facendo?",
        "- ",
        "",
        "Cosa ti aspettavi?",
        "- ",
        "",
        "Cosa è successo invece?",
        "- ",
        "",
        "Screenshot / video (se puoi):",
        "- ",
      ].join("\n")
    );

    const url = `mailto:${to}?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          "Feedback",
          "Non riesco ad aprire l’app Email. Puoi scriverci a support@clubandplayer.com."
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Feedback",
        "Non riesco ad aprire l’app Email. Puoi scriverci a support@clubandplayer.com."
      );
    }
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
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Profilo</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Account</Text>

        {authEmail ? (
          <>
            <Text style={{ color: "#111827" }}>
              Email: <Text style={{ fontWeight: "700" }}>{authEmail}</Text>
            </Text>

            <Pressable
              onPress={onLogout}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: "#111827",
                borderRadius: 10,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700" }}>Logout</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: "#111827" }}>
              Non risulti loggato. Vai al login.
            </Text>
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: "#111827",
                borderRadius: 10,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "700" }}>
                Vai al login
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Dati profilo</Text>

        {profileStatus === "loading" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text>Carico profilo…</Text>
          </View>
        )}

        {profileStatus === "error" && (
          <>
            <Text style={{ color: "#111827" }}>
              Non riesco a caricare il profilo dal database.
            </Text>
            <Pressable
              onPress={onOpenWebProfile}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: "#111827",
                borderRadius: 10,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "700" }}>
                Apri profilo sul web
              </Text>
            </Pressable>
          </>
        )}

        {profileStatus === "missing" && (
          <>
            <Text style={{ color: "#111827" }}>
              Profilo non trovato. Probabilmente non è stato ancora creato (o usa un mapping diverso).
            </Text>
            <Pressable
              onPress={onOpenWebProfile}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: "#0A66C2",
                borderRadius: 10,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "800" }}>
                Completa profilo sul web
              </Text>
            </Pressable>
          </>
        )}

        {profileStatus === "found" && profile && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 56, height: 56, borderRadius: 999 }}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    backgroundColor: "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>
                    {(buildDisplayName(profile).slice(0, 1) || "U").toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 18, fontWeight: "800" }}>
                  {buildDisplayName(profile)}
                </Text>
                <Text style={{ color: "#374151" }}>{buildTagline(profile)}</Text>
                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                  {buildLocation(profile)}
                </Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "700" }}>Bio</Text>
              <Text style={{ color: "#374151" }}>
                {profile.bio && profile.bio.trim().length > 0
                  ? profile.bio
                  : "Nessuna bio disponibile."}
              </Text>
            </View>

            <Text style={{ color: "#6b7280", fontSize: 12 }}>
              type: {(profile.account_type ?? profile.type ?? "—").toString()}
            </Text>
          </>
        )}
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Alpha feedback</Text>
        <Text style={{ color: "#374151" }}>
          Aiutaci a migliorare l’app: invia feedback in 30 secondi.
        </Text>

        <Pressable
          onPress={onFeedback}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: "#0A66C2",
            borderRadius: 10,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "800" }}>
            Invia feedback
          </Text>
        </Pressable>

        <Text style={{ fontSize: 12, color: "#6b7280" }}>{appVersionLabel}</Text>
      </View>
    </ScrollView>
  );
}
