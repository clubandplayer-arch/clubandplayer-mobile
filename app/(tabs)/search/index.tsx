import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

type ResultItem = {
  id: string;
  kind: "club" | "player";
  title: string;
  subtitle: string;
  avatarUrl: string | null;
};

function asString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function resolveKind(row: Record<string, unknown>): "club" | "player" {
  const kind = asString(row.account_type ?? row.type).toLowerCase();
  if (kind === "club") return "club";
  return "player";
}

function buildSubtitle(row: Record<string, unknown>, kind: "club" | "player"): string {
  if (kind === "club") {
    const parts = [asString(row.city), asString(row.province), asString(row.region), asString(row.country)].filter(Boolean);
    return parts.join(" • ") || "Club";
  }

  const parts = [asString(row.sport), asString(row.role)].filter(Boolean);
  return parts.join(" • ") || "Giocatore";
}

function mapRowToResult(row: Record<string, unknown>): ResultItem | null {
  const id = asString(row.id);
  if (!id) return null;

  const kind = resolveKind(row);
  const title = asString(row.full_name) || asString(row.display_name) || "Utente";

  return {
    id,
    kind,
    title,
    subtitle: buildSubtitle(row, kind),
    avatarUrl: asString(row.avatar_url) || null,
  };
}

function getProfilePath(item: ResultItem): string {
  if (item.kind === "club") return `/clubs/${item.id}`;
  return `/players/${item.id}`;
}

function Avatar({ url, label }: { url: string | null; label: string }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          backgroundColor: "#e5e7eb",
        }}
      />
    );
  }

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

  const suggestions = ["Calcio", "Portiere", "Under 21", "Sicilia", "Volley"];

  const query = useMemo(() => q.trim(), [q]);

  const loadResults = useCallback(async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ilike = `%${trimmed}%`;
      const { data, error: searchError } = await supabase
        .from("profiles")
        .select("id,full_name,display_name,avatar_url,account_type,type,city,province,region,country,sport,role")
        .or(`full_name.ilike.${ilike},display_name.ilike.${ilike}`)
        .limit(30);

      if (searchError) throw searchError;

      const mapped = (Array.isArray(data) ? data : [])
        .map((row) => mapRowToResult((row ?? {}) as Record<string, unknown>))
        .filter(Boolean) as ResultItem[];

      setResults(mapped);
    } catch (e: any) {
      setResults([]);
      setError(e?.message ? String(e.message) : "Errore nella ricerca");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadResults(query);
    } finally {
      setRefreshing(false);
    }
  }, [loadResults, query]);

  const Chip = ({ label }: { label: string }) => (
    <Pressable
      onPress={() => {
        setQ(label);
        loadResults(label);
      }}
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
            <Avatar url={item.avatarUrl} label={item.title} />
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
          onSubmitEditing={() => {
            loadResults(query);
          }}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
          }}
        />

        <Pressable
          onPress={() => {
            loadResults(query);
          }}
          style={{
            alignSelf: "flex-start",
            borderWidth: 1,
            borderRadius: 10,
            borderColor: "#111827",
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontWeight: "700", color: "#111827" }}>Cerca</Text>
        </Pressable>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {suggestions.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Risultati</Text>

        {!query ? (
          <Text style={{ color: "#374151" }}>
            Inizia a digitare per cercare profili reali.
          </Text>
        ) : loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: "#374151" }}>Ricerca in corso…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        ) : results.length === 0 ? (
          <Text style={{ color: "#374151" }}>
            Nessun risultato per “{query}”.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {results.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
