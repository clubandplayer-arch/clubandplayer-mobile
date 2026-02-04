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
} from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

export default function MeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const appVersionLabel = useMemo(() => {
    const expoConfig: any = Constants.expoConfig ?? Constants.manifest ?? {};
    const version = expoConfig?.version ?? "unknown";
    const androidCode =
      expoConfig?.android?.versionCode ??
      expoConfig?.extra?.eas?.build?.android?.versionCode ??
      "unknown";
    return `v${version} (${Platform.OS} ${androidCode})`;
  }, []);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setEmail(null);
        return;
      }
      setEmail(data.user?.email ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

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
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

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

  const onFeedback = async () => {
    const to = "support@clubandplayer.com";
    const subject = encodeURIComponent(
      `Feedback Club & Player Mobile — ${appVersionLabel}`
    );
    const body = encodeURIComponent(
      [
        `Versione: ${appVersionLabel}`,
        email ? `Account: ${email}` : "Account: (non loggato)",
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

        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text>Caricamento…</Text>
          </View>
        ) : email ? (
          <>
            <Text style={{ color: "#111827" }}>
              Email: <Text style={{ fontWeight: "700" }}>{email}</Text>
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

        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          {appVersionLabel}
        </Text>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Profilo</Text>
        <Text style={{ color: "#374151" }}>
          Qui aggiungeremo i tuoi dati (ruolo, sport, città, bio, foto) e la
          gestione del profilo.
        </Text>
      </View>
    </ScrollView>
  );
}
