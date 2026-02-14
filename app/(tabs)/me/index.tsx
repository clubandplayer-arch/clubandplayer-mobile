import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";

import { useWhoami, useWebSession } from "../../../src/lib/api";
import ClubProfile from "../../club/profile";
import PlayerProfile from "../../player/profile";

function normalizeRole(role: unknown) {
  return String(role ?? "").toLowerCase().trim();
}

export default function MeProfileDispatcher() {
  const router = useRouter();
  const web = useWebSession();
  const who = useWhoami(web.ready);

  useEffect(() => {
    if (web.loading || who.loading) return;
    if (who.error || !who.data) {
      router.replace("/(tabs)/feed");
    }
  }, [router, web.loading, who.data, who.error, who.loading]);

  if (web.loading || who.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (who.error || !who.data) {
    return null;
  }

  const role = normalizeRole((who.data as { role?: unknown } | null)?.role);
  if (role === "club") return <ClubProfile />;
  return <PlayerProfile />;
}
