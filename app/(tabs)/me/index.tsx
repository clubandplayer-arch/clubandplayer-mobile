import { ActivityIndicator, View } from "react-native";
import { useEffect, useMemo } from "react";
import { useRouter } from "expo-router";

import { useWhoami, useWebSession } from "../../../src/lib/api";

function normalizeRole(role: unknown) {
  return String(role ?? "").toLowerCase().trim();
}

export default function MeProfileDispatcher() {
  const router = useRouter();
  const web = useWebSession();
  const who = useWhoami(web.ready);

  const targetRoute = useMemo(() => {
    const role = normalizeRole((who.data as { role?: unknown } | null)?.role);
    return role === "club" ? "/(tabs)/me/club-profile" : "/(tabs)/me/player-profile";
  }, [who.data]);

  useEffect(() => {
    if (web.loading || who.loading) return;
    router.replace(targetRoute);
  }, [router, targetRoute, web.loading, who.loading]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
