import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { searchWeb, type SearchResultItem, type SearchType, useWebSession, useWhoami } from "../../../src/lib/api";

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#111827" : "#e5e7eb",
        backgroundColor: active ? "#111827" : "transparent",
      }}
    >
      <Text style={{ color: active ? "#ffffff" : "#111827", fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function getTitle(item: SearchResultItem): string {
  return (
    item.title ??
    item.name ??
    item.full_name ??
    item.display_name ??
    item.club_name ??
    item.player_name ??
    "Risultato"
  ).toString();
}

function getSubtitle(item: SearchResultItem): string {
  const subtitle =
    item.subtitle ??
    item.city ??
    item.sport ??
    item.role ??
    item.region ??
    item.province ??
    "";
  return subtitle ? subtitle.toString() : "";
}

function normalizeResults(raw: unknown): SearchResultItem[] {
  if (Array.isArray(raw)) return raw as SearchResultItem[];

  // common shapes
  const obj = raw as any;
  const candidates: unknown[] = [
    obj?.results,
    obj?.results?.items,
    obj?.items,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as SearchResultItem[];
  }

  // if results is an object of arrays: { clubs:[...], players:[...], opportunities:[...] }
  if (obj && typeof obj === "object") {
    const vals = Object.values(obj);
    const flattened: SearchResultItem[] = [];
    for (const v of vals) {
      if (Array.isArray(v)) flattened.push(...(v as SearchResultItem[]));
    }
    if (flattened.length) return flattened;
  }

  return [];
}

function filterByType(items: SearchResultItem[], type: SearchType): SearchResultItem[] {
  if (type === "all") return items;

  const prefix = type === "clubs" ? "/clubs/" : "/players/";
  return items.filter((it) => typeof (it as any).href === "string" && String((it as any).href).startsWith(prefix));
}

export default function SearchScreen() {
  const router = useRouter();

  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [q, setQ] = useState("");
  const [type, setType] = useState<SearchType>("all");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const canSearch = useMemo(() => q.trim().length > 0, [q]);

  useEffect(() => {
    if (!web.ready) return;
    if (!whoami.data?.user) return;

    const query = q.trim();

    if (!query) {
      setResults([]);
      setCounts(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        const res = await searchWeb({ q: query, type, page: 1, limit: 30, signal: controller.signal });
        if (controller.signal.aborted) return;

        if (!res.ok) {
          setLoading(false);
          setError(res.errorText ?? "Errore ricerca");
          setResults([]);
          setCounts(null);
          return;
        }

        const data = res.data as any;

        const normalized = normalizeResults(data?.results ?? data);
        const filtered = filterByType(normalized, type);

        setResults(filtered);
        setCounts((data?.counts as any) ?? null);
        setLoading(false);
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(e?.message ? String(e.message) : "Errore ricerca");
        setResults([]);
        setCounts(null);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, type, web.ready, whoami.data?.user]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }} contentContainerStyle={{ padding: 24, gap: 14 }}>
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Cerca</Text>

      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Ricerca</Text>

        <TextInput
          placeholder="Cerca club, giocatori…"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}
        />

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <TabButton active={type === "all"} label="Tutti" onPress={() => setType("all")} />
          <TabButton active={type === "clubs"} label="Club" onPress={() => setType("clubs")} />
          <TabButton active={type === "players"} label="Giocatori" onPress={() => setType("players")} />
        </View>

        {counts ? (
          <Text style={{ color: "#6b7280" }}>
            Totali: {Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(" • ")}
          </Text>
        ) : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Risultati</Text>

        {web.loading || whoami.loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ color: "#6b7280" }}>Verifico sessione…</Text>
          </View>
        ) : !whoami.data?.user ? (
          <Text style={{ color: "#b91c1c" }}>Login richiesto per la ricerca.</Text>
        ) : loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ color: "#6b7280" }}>Cerco…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        ) : !canSearch ? (
          <Text style={{ color: "#6b7280" }}>Inizia a digitare per cercare.</Text>
        ) : results.length === 0 ? (
          <Text style={{ color: "#6b7280" }}>Nessun risultato.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {results.map((item, idx) => {
              const href = typeof (item as any).href === "string" ? (item as any).href : "";
              const title = getTitle(item);
              const subtitle = getSubtitle(item);

              return (
                <Pressable
                  key={`${href}-${idx}`}
                  onPress={() => {
                    if (!href) return;
                    router.push(href as any);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontWeight: "900", fontSize: 16, color: "#111827" }}>{title}</Text>
                  {subtitle ? <Text style={{ color: "#374151" }}>{subtitle}</Text> : null}
                  <Text style={{ color: "#9ca3af", fontSize: 12 }}>{href}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
