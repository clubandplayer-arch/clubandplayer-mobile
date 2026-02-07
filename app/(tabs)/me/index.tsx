import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useWhoami } from "../../../src/lib/api";

import PlayerProfileScreen from "../../player/profile";
import ClubProfileScreen from "../../club/profile";

function normalizeRole(role: string | null | undefined) {
  return (role ?? "").toString().toLowerCase();
}

export default function MeProfileDispatcher() {
  const { data, loading, error, reload } = useWhoami();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>Caricamento…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Errore</Text>
        <Text style={{ color: "#b91c1c" }}>{error}</Text>

        <Pressable
          onPress={() => void reload()}
          style={{
            marginTop: 8,
            backgroundColor: "#111827",
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const role = normalizeRole(data?.role);
  const isClub = role === "club";

  // IMPORTANTISSIMO: niente Redirect/router.replace dentro Tab.
  // Renderizziamo la UI corretta nello stesso screen.
  return isClub ? <ClubProfileScreen /> : <PlayerProfileScreen />;
}
