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
import { type SearchApiPayload, type SearchItem, type SearchKind } from "../../../src/lib/api";
import { fetchSearchWithFilters } from "../../../src/lib/search";
import { CATEGORIES_BY_SPORT, SPORTS, SPORTS_ROLES } from "../../../src/lib/opportunities/formOptions";
import { theme } from "../../../src/theme";

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
          backgroundColor: theme.colors.neutral200,
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
        backgroundColor: theme.colors.neutral200,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontWeight: "800", color: theme.colors.text }}>{letter}</Text>
    </View>
  );
}

function normalizeFilterValue(raw: string): string {
  return raw.trim();
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string | string[];
    type?: string | string[];
    page?: string | string[];
    limit?: string | string[];
    sport?: string | string[];
    role?: string | string[];
    location?: string | string[];
    category?: string | string[];
  }>();

  const q = asSingleString(params.q);
  const type = normalizeKind(asSingleString(params.type));
  const page = normalizeNumber(asSingleString(params.page), 1);
  const limit = normalizeNumber(asSingleString(params.limit), 20);
  const sport = normalizeFilterValue(asSingleString(params.sport));
  const role = normalizeFilterValue(asSingleString(params.role));
  const location = normalizeFilterValue(asSingleString(params.location));
  const category = normalizeFilterValue(asSingleString(params.category));

  const [input, setInput] = useState(q);
  const [draftSport, setDraftSport] = useState(sport);
  const [draftRole, setDraftRole] = useState(role);
  const [draftLocation, setDraftLocation] = useState(location);
  const [draftCategory, setDraftCategory] = useState(category);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SearchApiPayload | null>(null);

  const prevTypeRef = useRef<SearchKind>(type);

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    setDraftSport(sport);
    setDraftRole(role);
    setDraftLocation(location);
    setDraftCategory(category);
  }, [sport, role, location, category]);

  const query = useMemo(() => q.trim(), [q]);

  const roleOptions = useMemo(() => SPORTS_ROLES[draftSport] ?? [], [draftSport]);
  const categoryOptions = useMemo(() => CATEGORIES_BY_SPORT[draftSport] ?? [], [draftSport]);

  const hasActiveFilters = useMemo(
    () => Boolean(sport || role || location || category),
    [sport, role, location, category],
  );

  const updateUrl = useCallback(
    (
      next: Partial<{ q: string; type: SearchKind; page: number; limit: number; sport: string; role: string; location: string; category: string }>,
      mode: "push" | "replace" = "replace",
    ) => {
      const nextQ = normalizeFilterValue(next.q ?? q);
      const nextType = next.type ?? type;
      const nextPage = next.page ?? page;
      const nextLimit = next.limit ?? limit;
      const nextSport = normalizeFilterValue(next.sport ?? sport);
      const nextRole = normalizeFilterValue(next.role ?? role);
      const nextLocation = normalizeFilterValue(next.location ?? location);
      const nextCategory = normalizeFilterValue(next.category ?? category);

      const sp = new URLSearchParams();
      if (nextQ) sp.set("q", nextQ);
      if (nextType !== "all") sp.set("type", nextType);
      if (nextPage !== 1) sp.set("page", String(nextPage));
      if (nextLimit !== 20) sp.set("limit", String(nextLimit));
      if (nextSport) sp.set("sport", nextSport);
      if (nextRole) sp.set("role", nextRole);
      if (nextLocation) sp.set("location", nextLocation);
      if (nextCategory) sp.set("category", nextCategory);

      const target = sp.toString() ? `/search?${sp.toString()}` : "/search";
      if (mode === "push") router.push(target as any);
      else router.replace(target as any);
    },
    [category, limit, location, page, q, role, router, sport, type],
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

      const response = await fetchSearchWithFilters({ q: query, type, page, limit, sport, role, location, category });
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
  }, [category, limit, location, page, query, role, sport, type]);

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

  const applyFilters = useCallback(() => {
    updateUrl(
      {
        sport: draftSport,
        role: draftRole,
        location: draftLocation,
        category: draftCategory,
        page: 1,
      },
      "push",
    );
  }, [draftCategory, draftLocation, draftRole, draftSport, updateUrl]);

  const resetFilters = useCallback(() => {
    setDraftSport("");
    setDraftRole("");
    setDraftLocation("");
    setDraftCategory("");
    updateUrl({ sport: "", role: "", location: "", category: "", page: 1 }, "push");
  }, [updateUrl]);

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
    <View
      key={`${item.kind}:${item.id}`}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 12,
        padding: 14,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => void onOpenResult(item)}>
          <Avatar url={item.image_url ?? null} label={item.title} />
        </Pressable>

        <Pressable onPress={() => void onOpenResult(item)} style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.title || "Risultato"}</Text>
        </Pressable>
      </View>

      {item.subtitle ? <Text style={{ color: theme.colors.text }}>{item.subtitle}</Text> : null}
      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{item.kind}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          padding: 16,
          gap: 10,
        }}
      >
        <TextInput
          placeholder="Cerca..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={onSubmitSearch}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 12,
            padding: 12,
          }}
        />
        <Pressable
          onPress={onSubmitSearch}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.primary,
            borderRadius: 10,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.background }}>Cerca</Text>
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
                  borderColor: active ? theme.colors.text : theme.colors.neutral200,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: active ? theme.colors.text : theme.colors.background,
                }}
              >
                <Text style={{ fontWeight: "700", color: active ? theme.colors.background : theme.colors.text }}>
                  {searchType}
                  {typeof count === "number" ? ` (${count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>Filtri avanzati</Text>
          {hasActiveFilters ? (
            <Pressable onPress={resetFilters}>
              <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Reset</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={{ fontWeight: "700" }}>Sport</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SPORTS.map((sportOption) => {
            const active = draftSport === sportOption;
            return (
              <Pressable
                key={sportOption}
                onPress={() => {
                  setDraftSport((prev) => {
                    const nextSport = prev === sportOption ? "" : sportOption;
                    const nextRoles = SPORTS_ROLES[nextSport] ?? [];
                    const nextCategories = CATEGORIES_BY_SPORT[nextSport] ?? [];
                    if (draftRole && !nextRoles.includes(draftRole)) setDraftRole("");
                    if (draftCategory && !nextCategories.includes(draftCategory)) setDraftCategory("");
                    return nextSport;
                  });
                }}
                style={{
                  borderWidth: 1,
                  borderColor: active ? theme.colors.text : theme.colors.neutral200,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: active ? theme.colors.text : theme.colors.background,
                }}
              >
                <Text style={{ fontWeight: "700", color: active ? theme.colors.background : theme.colors.text }}>{sportOption}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ fontWeight: "700" }}>Ruolo</Text>
        <TextInput
          placeholder={draftSport ? "Ruolo" : "Seleziona prima uno sport (oppure scrivi manualmente)"}
          value={draftRole}
          onChangeText={setDraftRole}
          autoCapitalize="words"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 12,
            padding: 12,
          }}
        />
        {roleOptions.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {roleOptions.map((roleOption) => {
              const active = draftRole === roleOption;
              return (
                <Pressable
                  key={roleOption}
                  onPress={() => setDraftRole((prev) => (prev === roleOption ? "" : roleOption))}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? theme.colors.text : theme.colors.neutral200,
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: active ? theme.colors.text : theme.colors.background,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: active ? theme.colors.background : theme.colors.text }}>{roleOption}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text style={{ fontWeight: "700" }}>Categoria</Text>
        <TextInput
          placeholder={draftSport ? "Categoria" : "Seleziona prima uno sport (oppure scrivi manualmente)"}
          value={draftCategory}
          onChangeText={setDraftCategory}
          autoCapitalize="words"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 12,
            padding: 12,
          }}
        />
        {categoryOptions.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categoryOptions.map((categoryOption) => {
              const active = draftCategory === categoryOption;
              return (
                <Pressable
                  key={categoryOption}
                  onPress={() => setDraftCategory((prev) => (prev === categoryOption ? "" : categoryOption))}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? theme.colors.text : theme.colors.neutral200,
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: active ? theme.colors.text : theme.colors.background,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: active ? theme.colors.background : theme.colors.text }}>{categoryOption}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text style={{ fontWeight: "700" }}>Area / location</Text>
        <TextInput
          placeholder="Es. Milano, Lombardia, Italia"
          value={draftLocation}
          onChangeText={setDraftLocation}
          autoCapitalize="words"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 12,
            padding: 12,
          }}
        />

        <Pressable
          onPress={applyFilters}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.primary,
            borderRadius: 10,
            padding: 12,
            alignItems: "center",
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.background }}>Applica filtri</Text>
        </Pressable>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          padding: 16,
          gap: 10,
        }}
      >
        {query.length < 2 ? (
          <Text style={{ color: theme.colors.text }}>Inserisci almeno 2 caratteri</Text>
        ) : loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: theme.colors.text }}>Ricerca in corso…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: theme.colors.danger }}>{error}</Text>
        ) : type === "all" ? (
          <View style={{ gap: 14 }}>
            {SEARCH_TYPES.filter((searchType) => searchType !== "all").map((sectionType) => {
              const sectionItems = Array.isArray(payload?.results?.[sectionType])
                ? payload?.results?.[sectionType] ?? []
                : [];
              if (sectionItems.length === 0) return null;

              return (
                <View key={sectionType} style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "700" }}>{sectionType}</Text>
                    <Pressable onPress={() => onChangeType(sectionType)}>
                      <Text style={{ fontWeight: "700", color: theme.colors.primary }}>Vedi tutti</Text>
                    </Pressable>
                  </View>
                  <View style={{ gap: 8 }}>{sectionItems.slice(0, 3).map((item) => renderRow(item))}</View>
                </View>
              );
            })}
          </View>
        ) : listItems.length === 0 ? (
          <Text style={{ color: theme.colors.text }}>Nessun risultato per “{query}”.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {listItems.map((item) => renderRow(item))}
            {canLoadMore ? (
              <Pressable
                onPress={() => updateUrl({ page: page + 1 }, "push")}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.neutral200,
                  borderRadius: 10,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={{ fontWeight: "700" }}>Carica altri</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
