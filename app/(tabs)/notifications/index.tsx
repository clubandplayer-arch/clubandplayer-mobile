import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
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
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Notifiche</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Stato</Text>

        {email ? (
          <Text style={{ color: "#111827" }}>
            Sei loggato come: <Text style={{ fontWeight: "700" }}>{email}</Text>
          </Text>
        ) : (
          <>
            <Text style={{ color: "#111827" }}>
              Non risulti loggato. Accedi per vedere le notifiche.
            </Text>
            <Pressable
              onPress={() => router.replace("/(auth)/login")}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                backgroundColor: "#111827",
                borderRadius: 10,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                Vai al login
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Attività</Text>

        <Text style={{ color: "#374151" }}>
          Nessuna notifica ancora. Qui vedrai like, commenti, follow e candidature.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => router.push("/(tabs)/feed")}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "700" }}>Vai al feed</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)/search")}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "700" }}>Cerca</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
