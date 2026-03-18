import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import SearchResultRow from "../../../src/components/search/SearchResultRow";
import {
  fetchSearch,
  type SearchApiPayload,
  type SearchFilters,
  type SearchItem,
  type SearchKind,
} from "../../../src/lib/api";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../../src/lib/geo/location";
import { SPORTS, SPORTS_ROLES } from "../../../src/lib/opportunities/formOptions";
import { theme } from "../../../src/theme";

const SEARCH_TYPES: SearchKind[] = ["all", "opportunities", "clubs", "players", "posts", "events"];
const PAGE_LIMIT = 10;
const EMPTY_RESULTS: NonNullable<SearchApiPayload["results"]> = {
  all: [],
  opportunities: [],
  clubs: [],
  players: [],
  posts: [],
  events: [],
};
const EMPTY_FILTERS: Required<SearchFilters> = {
  country: "",
  region: "",
  province: "",
  city: "",
  sport: "",
  role: "",
  status: "",
};
const COUNTRY_OPTIONS = [
  { label: "Tutti i paesi", value: "" },
  { label: "Italia", value: "IT" },
];

type FilterKey = keyof typeof EMPTY_FILTERS;

type PickerType = "country" | "region" | "province" | "city" | "sport" | "role";

function asSingleString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function normalizeKind(raw: string): SearchKind {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "opportunity") return "opportunities";
  if (normalized === "club") return "clubs";
  if (normalized === "player") return "players";
  if (normalized === "post") return "posts";
  if (normalized === "event") return "events";
  return SEARCH_TYPES.includes(normalized as SearchKind) ? (normalized as SearchKind) : "all";
}

function normalizeNumber(raw: string, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function FilterSelect({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6, flex: 1, minWidth: 150 }}>
      <Text style={{ fontWeight: "600", color: theme.colors.text }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: disabled ? theme.colors.neutral100 : theme.colors.background,
        }}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder}</Text>
      </Pressable>
    </View>
  );
}

function FilterPicker({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  options: Array<{ label: string; value: string }>;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 16,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", color: theme.colors.text }}>{title}</Text>
        <Pressable onPress={onClose}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Chiudi</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={`${title}:${option.value || "empty"}`}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              style={{
                borderWidth: 1,
                borderColor: active ? theme.colors.text : theme.colors.neutral200,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: active ? theme.colors.neutral100 : theme.colors.background,
              }}
            >
              <Text style={{ color: theme.colors.text }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function compactFilterValue(value: string) {
  return value.trim();
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string | string[];
    type?: string | string[];
    page?: string | string[];
    limit?: string | string[];
    country?: string | string[];
    region?: string | string[];
    province?: string | string[];
    city?: string | string[];
    sport?: string | string[];
    role?: string | string[];
    status?: string | string[];
  }>();

  const q = asSingleString(params.q);
  const type = normalizeKind(asSingleString(params.type));
  const page = normalizeNumber(asSingleString(params.page), 1);
  const limit = normalizeNumber(asSingleString(params.limit), PAGE_LIMIT);
  const filtersFromParams = useMemo(
    () => ({
      country: asSingleString(params.country).trim().toUpperCase(),
      region: asSingleString(params.region).trim(),
      province: asSingleString(params.province).trim(),
      city: asSingleString(params.city).trim(),
      sport: asSingleString(params.sport).trim(),
      role: asSingleString(params.role).trim(),
      status: asSingleString(params.status).trim(),
    }),
    [params.city, params.country, params.province, params.region, params.role, params.sport, params.status],
  );

  const [inputValue, setInputValue] = useState(q);
  const [filters, setFilters] = useState<Required<SearchFilters>>(filtersFromParams);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchApiPayload["results"]>(EMPTY_RESULTS);
  const [counts, setCounts] = useState<SearchApiPayload["counts"] | null>(null);
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [openPicker, setOpenPicker] = useState<PickerType | null>(null);

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    setFilters(filtersFromParams);
  }, [filtersFromParams]);

  useEffect(() => {
    void getRegions().then(setRegions);
  }, []);

  useEffect(() => {
    const nextRegion = regions.find((item) => item.name === filters.region);
    if (!nextRegion) {
      setProvinces([]);
      return;
    }
    void getProvinces(nextRegion.id).then(setProvinces);
  }, [filters.region, regions]);

  useEffect(() => {
    const nextProvince = provinces.find((item) => item.name === filters.province);
    if (!nextProvince) {
      setCities([]);
      return;
    }
    void getMunicipalities(nextProvince.id).then(setCities);
  }, [filters.province, provinces]);

  const isItalySelected = !filters.country || filters.country === "IT";
  const queryParam = q.trim();
  const roleOptions = useMemo(() => (filters.sport ? SPORTS_ROLES[filters.sport] ?? [] : []), [filters.sport]);

  const updateUrl = useCallback(
    (nextQuery: string, nextType: SearchKind, nextFilters: Required<SearchFilters>, nextPage = 1, mode: "push" | "replace" = "push") => {
      const sp = new URLSearchParams();
      if (nextQuery) sp.set("q", nextQuery);
      sp.set("type", nextType);
      Object.entries(nextFilters).forEach(([key, value]) => {
        const nextValue = compactFilterValue(String(value ?? ""));
        if (nextValue) sp.set(key, nextValue);
      });
      if (nextPage > 1) sp.set("page", String(nextPage));
      if (limit !== PAGE_LIMIT) sp.set("limit", String(limit));
      const href = `/search?${sp.toString()}`;
      if (mode === "replace") router.replace(href as any);
      else router.push(href as any);
    },
    [limit, router],
  );

  useEffect(() => {
    if (!queryParam) {
      setResults(EMPTY_RESULTS);
      setCounts(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (queryParam.length < 2) {
      setResults(EMPTY_RESULTS);
      setCounts(null);
      setError("Inserisci almeno 2 caratteri per avviare la ricerca.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const response = await fetchSearch({ q: queryParam, type, page, limit, ...filters });
      if (cancelled) return;

      if (response.ok === false) {
        setError(response.message || "Errore nel caricamento dei risultati");
        setLoading(false);
        return;
      }

      setCounts(response.data.counts ?? null);
      const nextResults = response.data.results ?? EMPTY_RESULTS;
      setResults((prev) => {
        if (type === "all" || page === 1) return nextResults;
        return {
          ...(prev ?? EMPTY_RESULTS),
          [type]: [...(((prev ?? EMPTY_RESULTS)[type] as SearchItem[] | undefined) ?? []), ...((nextResults[type] as SearchItem[] | undefined) ?? [])],
        };
      });
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [filters, limit, page, queryParam, type]);

  useEffect(() => {
    if (refreshing && !loading) setRefreshing(false);
  }, [loading, refreshing]);

  const activeResults = useMemo(() => {
    if (type === "all") return [] as SearchItem[];
    return (results?.[type] as SearchItem[] | undefined) ?? [];
  }, [results, type]);

  const hasMore = useMemo(() => {
    if (type === "all" || !counts) return false;
    const count = counts[type];
    return typeof count === "number" && activeResults.length < count;
  }, [activeResults.length, counts, type]);

  const applySearch = useCallback(
    (nextQuery: string, nextType: SearchKind, nextFilters: Required<SearchFilters>) => {
      updateUrl(nextQuery, nextType, nextFilters, 1, "push");
    },
    [updateUrl],
  );

  const handleSubmitSearch = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    applySearch(trimmed, "all", filters);
  }, [applySearch, filters, inputValue]);

  const handleTabChange = useCallback(
    (nextType: SearchKind) => {
      if (!queryParam) return;
      updateUrl(queryParam, nextType, filters, 1, "push");
    },
    [filters, queryParam, updateUrl],
  );

  const updateFilter = useCallback((key: FilterKey, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "country") {
        next.country = value.trim().toUpperCase();
        next.region = "";
        next.province = "";
        next.city = "";
      }
      if (key === "region") {
        next.province = "";
        next.city = "";
      }
      if (key === "province") {
        next.city = "";
      }
      if (key === "sport") {
        if (prev.role && !(SPORTS_ROLES[value] ?? []).includes(prev.role)) next.role = "";
      }
      return next;
    });
  }, []);

  const applyFilters = useCallback(() => {
    if (!queryParam) return;
    updateUrl(queryParam, type, filters, 1, "push");
  }, [filters, queryParam, type, updateUrl]);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    if (!queryParam) return;
    updateUrl(queryParam, type, EMPTY_FILTERS, 1, "push");
  }, [queryParam, type, updateUrl]);

  const onRefresh = useCallback(() => {
    if (!queryParam || queryParam.length < 2) return;
    setRefreshing(true);
    updateUrl(queryParam, type, filters, 1, "replace");
  }, [filters, queryParam, type, updateUrl]);

  const onOpenResult = useCallback(
    async (item: SearchItem) => {
      const href = item.href?.trim();
      if (!href) return;
      if (href.startsWith("/")) {
        router.push(href as any);
        return;
      }
      await Linking.openURL(href);
    },
    [router],
  );

  const pickerOptions = useMemo(() => {
    if (openPicker === "country") return COUNTRY_OPTIONS;
    if (openPicker === "region") return [{ label: "Tutte le regioni", value: "" }, ...regions.map((item) => ({ label: item.name, value: item.name }))];
    if (openPicker === "province") return [{ label: "Tutte le province", value: "" }, ...provinces.map((item) => ({ label: item.name, value: item.name }))];
    if (openPicker === "city") return [{ label: "Tutte le città", value: "" }, ...cities.map((item) => ({ label: item.name, value: item.name }))];
    if (openPicker === "sport") return [{ label: "Tutti gli sport", value: "" }, ...SPORTS.map((item) => ({ label: item, value: item }))];
    if (openPicker === "role") return [{ label: "Tutti i ruoli", value: "" }, ...roleOptions.map((item) => ({ label: item, value: item }))];
    return [] as Array<{ label: string; value: string }>;
  }, [cities, openPicker, provinces, regions, roleOptions]);

  const pickerSelected = openPicker ? filters[openPicker] : "";
  const pickerTitle =
    openPicker === "country"
      ? "Nazione"
      : openPicker === "region"
        ? "Regione"
        : openPicker === "province"
          ? "Provincia"
          : openPicker === "city"
            ? "Città"
            : openPicker === "sport"
              ? "Sport"
              : openPicker === "role"
                ? "Ruolo"
                : "";

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Cerca club, player, opportunità, post, eventi…"
            placeholderTextColor={theme.colors.muted}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              height: 46,
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              borderRadius: 999,
              paddingHorizontal: 16,
              color: theme.colors.text,
              backgroundColor: theme.colors.background,
            }}
          />
          <Pressable
            onPress={handleSubmitSearch}
            style={{
              borderRadius: 999,
              paddingHorizontal: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Cerca</Text>
          </Pressable>
        </View>

        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 16, padding: 14, gap: 14 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <FilterSelect label="Nazione" value={filters.country} placeholder="Tutti i paesi" onPress={() => setOpenPicker("country")} />
            <FilterSelect
              label="Regione"
              value={filters.region}
              placeholder={isItalySelected ? "Tutte le regioni" : "Disponibile solo con Italia"}
              disabled={!isItalySelected}
              onPress={() => setOpenPicker("region")}
            />
            <FilterSelect
              label="Provincia"
              value={filters.province}
              placeholder="Tutte le province"
              disabled={!isItalySelected || !filters.region}
              onPress={() => setOpenPicker("province")}
            />
            <FilterSelect
              label="Città"
              value={filters.city}
              placeholder="Tutte le città"
              disabled={!isItalySelected || !filters.province}
              onPress={() => setOpenPicker("city")}
            />
            <FilterSelect label="Sport" value={filters.sport} placeholder="Tutti gli sport" onPress={() => setOpenPicker("sport")} />
            <FilterSelect
              label="Ruolo"
              value={filters.role}
              placeholder={filters.sport ? "Tutti i ruoli" : "Seleziona prima uno sport"}
              disabled={!filters.sport}
              onPress={() => setOpenPicker("role")}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={applyFilters}
              disabled={!queryParam}
              style={{
                borderRadius: 999,
                backgroundColor: queryParam ? theme.colors.primary : theme.colors.neutral200,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Applica filtri</Text>
            </Pressable>
            <Pressable onPress={clearFilters} style={{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Reset</Text>
            </Pressable>
          </View>
        </View>

        {openPicker ? (
          <FilterPicker title={pickerTitle} options={pickerOptions} selected={pickerSelected} onSelect={(value) => updateFilter(openPicker, value)} onClose={() => setOpenPicker(null)} />
        ) : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {SEARCH_TYPES.map((itemType) => {
          const active = type === itemType;
          const count = counts?.[itemType];
          return (
            <Pressable
              key={itemType}
              onPress={() => handleTabChange(itemType)}
              style={{
                borderWidth: 1,
                borderColor: active ? theme.colors.text : theme.colors.neutral200,
                backgroundColor: active ? theme.colors.text : theme.colors.background,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: active ? theme.colors.background : theme.colors.text, fontWeight: "700" }}>
                {itemType}
                {typeof count === "number" ? ` (${count})` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 16, padding: 16, gap: 12 }}>
        {!queryParam ? (
          <Text style={{ color: theme.colors.muted }}>Inserisci una ricerca per iniziare.</Text>
        ) : queryParam.length < 2 ? (
          <Text style={{ color: theme.colors.danger }}>Inserisci almeno 2 caratteri per avviare la ricerca.</Text>
        ) : loading && page === 1 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: theme.colors.text }}>Ricerca in corso…</Text>
          </View>
        ) : error ? (
          <Text style={{ color: theme.colors.danger }}>{error}</Text>
        ) : type === "all" ? (
          <View style={{ gap: 18 }}>
            {SEARCH_TYPES.filter((itemType) => itemType !== "all").map((sectionType) => {
              const sectionItems = ((results?.[sectionType] as SearchItem[] | undefined) ?? []).slice(0, 3);
              if (sectionItems.length === 0) return null;
              return (
                <View key={sectionType} style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>{sectionType}</Text>
                    <Pressable onPress={() => handleTabChange(sectionType)}>
                      <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                        Vedi tutti{typeof counts?.[sectionType] === "number" ? ` (${counts?.[sectionType]})` : ""}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ gap: 8 }}>
                    {sectionItems.map((item) => (
                      <SearchResultRow key={`${item.kind}:${item.id}`} result={item} onPress={onOpenResult} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : activeResults.length === 0 ? (
          <Text style={{ color: theme.colors.text }}>Nessun risultato per “{queryParam}”.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {activeResults.map((item) => (
              <SearchResultRow key={`${item.kind}:${item.id}`} result={item} onPress={onOpenResult} />
            ))}
            {hasMore ? (
              <Pressable
                onPress={() => updateUrl(queryParam, type, filters, page + 1, "push")}
                style={{
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.neutral200,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                {loading ? <ActivityIndicator size="small" /> : <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Carica altri risultati</Text>}
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
