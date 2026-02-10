import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getWebBaseUrl } from "../../../src/lib/api";

type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string | null;
  href: string; // already built by WEB API: /clubs/[id] or /players/[id] or /opportunities/[id]
  kind: string; // "club" | "player" | "opportunity" | ...
};

type SearchResultsSections = {
  clubs?: SearchResultItem[];
  players?: SearchResultItem[];
  opportunities?: SearchResultItem[];
  [key: string]: SearchResultItem[] | undefined;
};

type SearchPayload = {
  ok: boolean;
  results?: SearchResultsSections;
  counts?: Record<string, number>;
  query?: string;
  type?: string;
  page?: number;
  limit?: number;
};

function asString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeHref(href: string): string | null {
  const h = asString(href);
  if (!h) return null;

  // accept relative profile routes only (no invention)
  if (h.startsWith("/clubs/") || h.startsWith("/players/")) return h;

  // support absolute URLs
  try {
    if (h.startsWith("http://") || h.startsWith("https://")) {
      const u = new URL(h);
      if (u.pathname.startsWith("/clubs/") || u.pathname.startsWith("/players/")) return u.pathname;
    }
  } catch {
    // ignore
  }

  return null;
}

function flattenResults(results: SearchResultsSections | undefined): SearchResultItem[] {
  if (!results) return [];
  const clubs = Array.isArray(results.clubs) ? results.clubs : [];
  const players = Array.isArray(results.players) ? results.players : [];
  // ignore opportunities for now (route not implemented mobile-side)
  return [...clubs, ...players];
}

function Avatar({ url, label }: { url: string | null; label: string }) {
  const safeUrl = url && url.trim() ? url.trim() : null;

  if (safeUrl) {
    return (
      <Image
        source={{ uri: safeUrl }}
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
  const [type, setType] = useState<"all" | "clubs" | "players">("all");
  const [page] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const suggestions = ["Calcio", "Portiere", "Under 21", "Sicilia", "Volley", "Carlentini"];

  const query = useMemo(() => q.trim(), [q]);

  const fetchSearch = useCallback(
    async (nextQuery: string, nextType: "all" | "clubs" | "players", nextPage: number) => {
      const trimmed = nextQuery.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setCounts(null);
        setError(null);
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const base = getWebBaseUrl();
        const params = new URLSearchParams({
          q: trimmed,
          type: nextType,
          page: String(nextPage),
          limit: String(30),
        });

        const res = await fetch(`${base}/api/search?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        const payload = (await res.json()) as SearchPayload;

        if (!res.ok || !payload?.ok) {
          throw new Error(`Errore search (${res.status})`);
        }

        const flat = nextType === "all"
          ? flattenResults(payload.results)
          : Array.isArray(payload.results?.[nextType])
            ? (payload.results?.[nextType] as SearchResultItem[])
            : [];

        // normalize href and keep only supported routes
        const mapped = flat
          .map((item) => {
            const href = normalizeHref(asString(item.href));
            if (!href) return null;
            return {
              ...item,
              href,
              title: asString(item.title) || "Risultato",
              subtitle: asString(item.subtitle) || "",
              image_url: asString(item.image_url) || null,
            } as SearchResultItem;
          })
          .filter(Boolean) as SearchResultItem[];

        setResults(mapped);
        setCounts(payload.counts ?? null);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setResults([]);
        setCounts(null);
        setError(e?.message ? String(e.message) : "Errore nella ricerca");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const load = useCallback(async () => {
    await fetchSearch(query, type, page);
  }, [fetchSearch, page, query, type]);

  useEffect(() => {
    // parity WEB: trigger on query/type/page change (no debounce, only guard length>=2)
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, page]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

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

  const Tab = ({ label, value }: { label: string; value: "all" | "clubs" | "players" }) => {
    const active = type === value;
    const countValue = counts ? counts[value] : null;

    return (
      <Pressable
        onPress={() => setType(value)}
        style={{
          borderWidth: 1,
          borderColor: active ? "#111827" : "#e5e7eb",
          borderRadius: 999,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: active ? "#111827" : "#ffffff",
        }}
      >
        <Text style={{ fontWeight: "700", color: active ? "#ffffff" : "#111827" }}>
          {label}
          {typeof countValue === "number" ? ` (${countValue})` : ""}
        </Text>
      </Pressable>
    );
  };

  const Row = ({ item }: { item: SearchResultItem }) => {
    // parity WEB: only avatar + title navigate, not the full card
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
          <Pressable onPress={() => router.push(item.href)}>
            <Avatar url={item.image_url ?? null} label={item.title} />
          </Pressable>

          <Pressable onPress={() => router.push(item.href)} style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.title}</Text>
          </Pressable>
        </View>

        {item.subtitle ? <Text style={{ color: "#374151" }}>{item.subtitle}</Text> : null}

        <Text style={{ color: "#6b7280", fontSize: 12 }}>
          {item.kind === "club" ? "Club" : item.kind === "player" ? "Giocatore" : item.kind}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Cerca</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Ricerca</Text>

        <TextInput
          placeholder="Cerca club, giocatori… (min 2 caratteri)"
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
          <Tab label="Tutti" value="all" />
          <Tab label="Club" value="clubs" />
          <Tab label="Giocatori" value="players" />
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {suggestions.map((s) => (
            <Chip key={s} label={s} />
          ))}
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Risultati</Text>

        {query.length < 2 ? (
          <Text style={{ color: "#374151" }}>Digita almeno 2 caratteri per cercare.</Text>
        ) : loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: "#374151" }}>Ricerca in corso…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        ) : results.length === 0 ? (
          <Text style={{ color: "#374151" }}>Nessun risultato per “{query}”.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {results.map((item) => (
              <Row key={`${item.kind}:${item.id}`} item={item} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
