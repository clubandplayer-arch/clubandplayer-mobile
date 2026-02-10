import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";

type ResultItem = {
  id: string;
  kind: "club" | "player";
  title: string;
  subtitle: string;
};

const SAMPLE_RESULTS: ResultItem[] = [
  { id: "c1", kind: "club", title: "Club Atlético Carlentini", subtitle: "Calcio • Sicilia" },
  { id: "c2", kind: "club", title: "ASD Lentini", subtitle: "Calcio • Sicilia" },
  { id: "p1", kind: "player", title: "Marco Rossi", subtitle: "Attaccante • 25 anni" },
  { id: "p2", kind: "player", title: "Luca Bianchi", subtitle: "Portiere • 22 anni" },
];

function getProfilePath(item: ResultItem): string {
  if (item.kind === "club") return `/clubs/${item.id}`;
  return `/players/${item.id}`;
}

function AvatarPlaceholder({ label }: { label: string }) {
  const letter = (label.trim().slice(0, 1) || "U").toUpperCase();
  return (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 999,
        backgroundColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontWeight: "800", color: "#111827" }}>{letter}</Text>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const suggestions = ["Calcio", "Portiere", "Under 21", "Sicilia", "Volley"];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return SAMPLE_RESULTS.filter((r) => {
      const hay = `${r.title} ${r.subtitle}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q]);

  const onRefresh = async () => {
    // Placeholder: in futuro ricaricherà da backend
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const Chip = ({ label }: { label: string }) => (
    <Pressable
      onPress={() => setQ(label)}
      style={{
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  const Row = ({ item }: { item: ResultItem }) => {
    const profilePath = getProfilePath(item);

    return (
      <View
        style={{
          borderWidth: 1,
          borderRadius: 12,
          padding: 14,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => {
              router.push(profilePath);
            }}
          >
            <AvatarPlaceholder label={item.title} />
          </Pressable>

          <Pressable
            onPress={() => {
              router.push(profilePath);
            }}
            style={{ flex: 1 }}
          >
            <Text style={{ fontWeight: "800", fontSize: 16 }}>
              {item.title}
            </Text>
          </Pressable>
        </View>

        <Text style={{ color: "#374151" }}>{item.subtitle}</Text>
        <Text style={{ color: "#6b7280", fontSize: 12 }}>
          {item.kind === "club" ? "Club" : "Giocatore"}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Cerca</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Ricerca</Text>

        <TextInput
          placeholder="Cerca club, giocatori, ruoli, città…"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
          }}
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {suggestions.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Risultati</Text>

        {!q.trim() ? (
          <Text style={{ color: "#374151" }}>
            Inizia a digitare per cercare. (Per ora i risultati sono demo: collegheremo
            Supabase nel prossimo step.)
          </Text>
        ) : filtered.length === 0 ? (
          <>
            <Text style={{ color: "#374151" }}>
              Nessun risultato per “{q.trim()}”.
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
                <Text style={{ color: "#111827", fontWeight: "700" }}>
                  Vai al feed
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/(tabs)/create")}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: "#111827",
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "700" }}>
                  Crea post
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
