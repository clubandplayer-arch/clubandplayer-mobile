import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchSearch, type SearchApiPayload, type SearchItem, type SearchKind } from "../../../src/lib/api";

const SEARCH_TYPES: SearchKind[] = ["all", "clubs", "players", "opportunities", "posts", "events"];

function asSingleString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function normalizeKind(raw: string): SearchKind {
  return SEARCH_TYPES.includes(raw as SearchKind) ? (raw as SearchKind) : "all";
}

function normalizeNumber(raw: string, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
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
  const params = useLocalSearchParams<{ q?: string | string[]; type?: string | string[]; page?: string | string[]; limit?: string | string[] }>();

  const q = asSingleString(params.q);
  const type = normalizeKind(asSingleString(params.type));
  const page = normalizeNumber(asSingleString(params.page), 1);
  const limit = normalizeNumber(asSingleString(params.limit), 20);

  const [input, setInput] = useState(q);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SearchApiPayload | null>(null);

  const prevTypeRef = useRef<SearchKind>(type);

  useEffect(() => {
    setInput(q);
  }, [q]);

  const query = useMemo(() => q.trim(), [q]);

  const updateUrl = useCallback(
    (next: Partial<{ q: string; type: SearchKind; page: number; limit: number }>, mode: "push" | "replace" = "replace") => {
      const nextQ = (next.q ?? q).trim();
      const nextType = next.type ?? type;
      const nextPage = next.page ?? page;
      const nextLimit = next.limit ?? limit;

      const sp = new URLSearchParams();
      if (nextQ) sp.set("q", nextQ);
      if (nextType !== "all") sp.set("type", nextType);
      if (nextPage !== 1) sp.set("page", String(nextPage));
      if (nextLimit !== 20) sp.set("limit", String(nextLimit));

      const target = sp.toString() ? `/search?${sp.toString()}` : "/search";
      if (mode === "push") router.push(target as any);
      else router.replace(target as any);
    },
    [limit, page, q, router, type],
  );

  useEffect(() => {
    let cancelled = false;
    const search = async () => {
      if (query.length < 2) {
        setPayload(null);
        setError(null);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const isLoadMore = type !== "all" && prevTypeRef.current === type && page > 1;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const response = await fetchSearch({ q: query, type, page, limit });
      if (cancelled) return;

      if (response.ok === false) {
        setPayload(null);
        if (response.status === 429 || response.code === "RATE_LIMITED") setError("Too Many Requests");
        else setError(response.message || "Errore nella ricerca");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setPayload((prev) => {
        if (!isLoadMore || !prev) return response.data;

        const currentItems = Array.isArray(prev.results?.[type]) ? prev.results?.[type] ?? [] : [];
        const incomingItems = Array.isArray(response.data.results?.[type]) ? response.data.results?.[type] ?? [] : [];
        return {
          ...response.data,
          counts: response.data.counts ?? prev.counts,
          results: {
            ...(response.data.results ?? {}),
            [type]: [...currentItems, ...incomingItems],
          },
        };
      });

      setLoading(false);
      setLoadingMore(false);
    };

    void search();
    prevTypeRef.current = type;

    return () => {
      cancelled = true;
    };
  }, [limit, page, query, type]);

  const onRefresh = useCallback(async () => {
    if (query.length < 2) return;
    setRefreshing(true);
    updateUrl({ page: 1 }, "replace");
  }, [query.length, updateUrl]);

  useEffect(() => {
    if (!refreshing) return;
    if (loading || loadingMore) return;
    setRefreshing(false);
  }, [refreshing, loading, loadingMore]);

  const onSubmitSearch = useCallback(() => {
    updateUrl({ q: input, page: 1 }, "push");
  }, [input, updateUrl]);

  const onChangeType = useCallback(
    (nextType: SearchKind) => {
      updateUrl({ type: nextType, page: 1 }, "push");
    },
    [updateUrl],
  );

  const onOpenResult = useCallback(
    async (item: SearchItem) => {
      const href = typeof item.href === "string" ? item.href.trim() : "";
      if (!href) return;
      if (href.startsWith("/")) {
        router.push(href as any);
        return;
      }
      await Linking.openURL(href);
    },
    [router],
  );

  const counts = payload?.counts ?? {};
  const listItems = type !== "all" && Array.isArray(payload?.results?.[type]) ? payload?.results?.[type] ?? [] : [];
  const totalForType = type !== "all" && typeof counts?.[type] === "number" ? counts[type] : null;
  const canLoadMore = totalForType !== null && listItems.length < totalForType;

  const renderRow = (item: SearchItem) => (
    <View key={`${item.kind}:${item.id}`} style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => void onOpenResult(item)}>
          <Avatar url={item.image_url ?? null} label={item.title} />
        </Pressable>

        <Pressable onPress={() => void onOpenResult(item)} style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.title || "Risultato"}</Text>
        </Pressable>
      </View>

      {item.subtitle ? <Text style={{ color: "#374151" }}>{item.subtitle}</Text> : null}
      <Text style={{ color: "#6b7280", fontSize: 12 }}>{item.kind}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Cerca</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <TextInput
          placeholder="Cerca..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={onSubmitSearch}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}
        />
        <Pressable onPress={onSubmitSearch} style={{ borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" }}>
          <Text style={{ fontWeight: "700" }}>Cerca</Text>
        </Pressable>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {SEARCH_TYPES.map((searchType) => {
            const active = type === searchType;
            const count = counts?.[searchType];
            return (
              <Pressable
                key={searchType}
                onPress={() => onChangeType(searchType)}
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
                  {searchType}
                  {typeof count === "number" ? ` (${count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        {query.length < 2 ? (
          <Text style={{ color: "#374151" }}>Inserisci almeno 2 caratteri</Text>
        ) : loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: "#374151" }}>Ricerca in corso…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        ) : type === "all" ? (
          <View style={{ gap: 14 }}>
            {SEARCH_TYPES.filter((searchType) => searchType !== "all").map((sectionType) => {
              const sectionItems = Array.isArray(payload?.results?.[sectionType]) ? payload?.results?.[sectionType] ?? [] : [];
              if (sectionItems.length === 0) return null;

              return (
                <View key={sectionType} style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "700" }}>{sectionType}</Text>
                    <Pressable onPress={() => onChangeType(sectionType)}>
                      <Text style={{ fontWeight: "700" }}>Vedi tutti</Text>
                    </Pressable>
                  </View>
                  <View style={{ gap: 8 }}>{sectionItems.slice(0, 3).map((item) => renderRow(item))}</View>
                </View>
              );
            })}
          </View>
        ) : listItems.length === 0 ? (
          <Text style={{ color: "#374151" }}>Nessun risultato per “{query}”.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {listItems.map((item) => renderRow(item))}
            {canLoadMore ? (
              <Pressable
                onPress={() => updateUrl({ page: page + 1 }, "push")}
                style={{ borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" }}
              >
                {loadingMore ? <ActivityIndicator size="small" /> : <Text style={{ fontWeight: "700" }}>Carica altri</Text>}
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
