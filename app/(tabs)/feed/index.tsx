import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

export default function FeedScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

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

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Feed</Text>

      <View
        style={{
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Accesso</Text>

        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text>Verifico sessione…</Text>
          </View>
        ) : email ? (
          <>
            <Text style={{ color: "#111827" }}>
              Sei loggato come: <Text style={{ fontWeight: "700" }}>{email}</Text>
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
              <Text style={{ color: "#111827", fontWeight: "700" }}>Vai al login</Text>
            </Pressable>
          </>
        )}
      </View>

      <View
        style={{
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Azioni rapide</Text>

        <Pressable
          onPress={() => router.push("/(tabs)/create")}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700" }}>Crea post</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700" }}>Cerca</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/notifications")}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700" }}>Notifiche</Text>
        </Pressable>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Contenuti</Text>
        <Text style={{ color: "#374151" }}>
          Nessun contenuto ancora. Qui compariranno i post delle persone e dei club che segui.
        </Text>
      </View>
    </ScrollView>
  );
}
