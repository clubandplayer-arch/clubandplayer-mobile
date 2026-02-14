import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useWebSession, useWhoami } from "../../src/lib/api";

function normalizeRole(role: unknown) {
  return String(role ?? "").toLowerCase().trim();
}

export default function ApplicationsRoleRedirectScreen() {
  const router = useRouter();
  const web = useWebSession();
  const who = useWhoami(web.ready);

  useEffect(() => {
    if (web.loading || who.loading) return;
    if (web.error || who.error || !who.data) return;

    const role = normalizeRole((who.data as { role?: unknown } | null)?.role);
    if (role === "club") {
      router.replace("/club/applications");
      return;
    }
    router.replace("/my/applications");
  }, [router, web.error, web.loading, who.data, who.error, who.loading]);

  if (web.loading || who.loading || (!web.error && !who.error && !who.data)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (web.error || who.error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Sessione non disponibile</Text>
        <Pressable
          onPress={() => {
            void web.retry();
            void who.reload();
          }}
          style={{ marginTop: 14, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}
        >
          <Text style={{ fontWeight: "600" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
