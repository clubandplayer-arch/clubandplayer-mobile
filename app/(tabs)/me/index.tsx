import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useWhoami, useWebSession } from "../../../src/lib/api";

import PlayerProfileScreen from "../../player/profile";
import ClubProfileScreen from "../../club/profile";

function normalizeRole(role: unknown) {
  return (role ?? "").toString().toLowerCase().trim();
}

export default function MeProfileDispatcher() {
  // 1) PRIMA di tutto: sincronizza cookie web (equivalente al bottone PR1)
  const web = useWebSession();

  // 2) SOLO dopo che la session è pronta, chiedi whoami
  const who = useWhoami(web.ready);

  // Se stiamo ancora facendo sync, mostra loader
  if (web.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>
          Sincronizzazione sessione…
        </Text>
      </View>
    );
  }

  if (web.error) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Errore sessione</Text>
        <Text style={{ color: "#b91c1c" }}>{web.error}</Text>

        <Pressable
          onPress={() => void web.retry()}
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

  if (!web.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>
          Sincronizzazione sessione…
        </Text>
      </View>
    );
  }

  // Ora che la sessione web è pronta, useWhoami(web.ready) partirà automaticamente.
  // Se whoami è ancora loading, aspetta; se errore, mostra e consenti retry.
  if (who.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>
          Caricamento profilo…
        </Text>
      </View>
    );
  }

  if (who.error) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Errore</Text>
        <Text style={{ color: "#b91c1c" }}>{who.error}</Text>

        <Pressable
          onPress={() => void who.reload()}
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

  const role = normalizeRole((who.data as any)?.role);

  // Web whoami può restituire role "athlete" (player) oppure "club"
  const isClub = role === "club";
  const isPlayer = role === "player" || role === "athlete";

  if (isClub) return <ClubProfileScreen />;
  if (isPlayer) return <PlayerProfileScreen />;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
      <Text style={{ marginTop: 12, color: "#6b7280" }}>
        Caricamento profilo…
      </Text>
    </View>
  );
}
