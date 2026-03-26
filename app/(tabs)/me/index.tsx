import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useWhoami, useWebSession } from "../../../src/lib/api";
import ClubProfile from "../../club/profile";
import PlayerProfile from "../../player/profile";

function normalizeRole(role: unknown) {
  return String(role ?? "").toLowerCase().trim();
}

const ADMIN_ME_ENTRY_EMAILS = new Set(["clubandplayer@gmail.com"]);

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
  const whoamiData = (who.data as { admin?: unknown; clubsAdmin?: unknown; user?: { email?: unknown } } | null) ?? null;
  const email = typeof whoamiData?.user?.email === "string" ? whoamiData.user.email.toLowerCase().trim() : "";
  const isAdminByFlag = Boolean(whoamiData?.admin) || Boolean(whoamiData?.clubsAdmin);
  const isAdminByEmail = ADMIN_ME_ENTRY_EMAILS.has(email);
  const isAdmin = isAdminByFlag || isAdminByEmail;
  if (isAdmin) {
    return (
      <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>Pannello profilo</Text>
        <Text>Account admin rilevato.</Text>
        <Pressable
          onPress={() => router.push("/admin/users")}
          style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}
        >
          <Text style={{ fontWeight: "600" }}>Admin users</Text>
        </Pressable>
      </View>
    );
  }
  if (role === "club") return <ClubProfile />;
  return <PlayerProfile />;
}
