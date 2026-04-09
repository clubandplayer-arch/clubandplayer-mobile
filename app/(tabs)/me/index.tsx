import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useWhoami, useWebSession } from "../../../src/lib/api";
import ClubProfile from "../../club/profile";
import FanProfile from "../../fan/profile";
import PlayerProfile from "../../player/profile";

function normalizeRole(role: unknown) {
  return String(role ?? "").toLowerCase().trim();
}

export default function MeProfileDispatcher() {
  const router = useRouter();
  const web = useWebSession();
  const who = useWhoami(web.ready);

  if (web.error || who.error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Sessione non disponibile</Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          <Pressable
            onPress={() => {
              void web.retry();
              void who.reload();
            }}
            style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}
          >
            <Text style={{ fontWeight: "600" }}>Riprova</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(tabs)/feed")}
            style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}
          >
            <Text style={{ fontWeight: "600" }}>Vai al Feed</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (web.loading || who.loading || !who.data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const role = normalizeRole((who.data as { role?: unknown } | null)?.role);
  if (role === "club") return <ClubProfile />;
  if (role === "fan") return <FanProfile />;
  return <PlayerProfile />;
}
