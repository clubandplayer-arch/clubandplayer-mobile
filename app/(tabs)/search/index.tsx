import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type SearchApiPayload, type SearchItem, type SearchKind } from "../../../src/lib/api";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../../src/lib/geo/location";
import { fetchSearchWithFilters } from "../../../src/lib/search";
import { CATEGORIES_BY_SPORT, SPORTS, SPORTS_ROLES } from "../../../src/lib/opportunities/formOptions";
import { theme } from "../../../src/theme";

const SEARCH_TYPES: SearchKind[] = ["all", "clubs", "players", "opportunities", "posts", "events"];
const COUNTRY_OPTIONS = [{ label: "Italia (IT)", value: "IT" }] as const;

type PickerKind = "country" | "region" | "province" | "city" | "sport" | "category" | "role";
type PickerOption = { label: string; value: string };

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

function normalizeFilterValue(raw: string): string {
  return raw.trim();
}

function SelectField({
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
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700", color: theme.colors.text }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: disabled ? theme.colors.neutral100 : theme.colors.background,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder}</Text>
      </Pressable>
    </View>
  );
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

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string | string[];
    type?: string | string[];
    page?: string | string[];
    limit?: string | string[];
    sport?: string | string[];
    role?: string | string[];
    category?: string | string[];
    location?: string | string[];
    country?: string | string[];
    region?: string | string[];
    province?: string | string[];
    city?: string | string[];
  }>();

  const q = asSingleString(params.q);
  const type = normalizeKind(asSingleString(params.type));
  const page = normalizeNumber(asSingleString(params.page), 1);
  const limit = normalizeNumber(asSingleString(params.limit), 20);
  const sport = normalizeFilterValue(asSingleString(params.sport));
  const role = normalizeFilterValue(asSingleString(params.role));
  const category = normalizeFilterValue(asSingleString(params.category));
  const legacyLocation = normalizeFilterValue(asSingleString(params.location));
  const country = normalizeFilterValue(asSingleString(params.country)) || "IT";
  const region = normalizeFilterValue(asSingleString(params.region));
  const province = normalizeFilterValue(asSingleString(params.province));
  const city = normalizeFilterValue(asSingleString(params.city));

  const [input, setInput] = useState(q);
  const [draftCountry, setDraftCountry] = useState(country);
  const [draftRegion, setDraftRegion] = useState(region);
  const [draftProvince, setDraftProvince] = useState(province);
  const [draftCity, setDraftCity] = useState(city);
  const [draftSport, setDraftSport] = useState(sport);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftRole, setDraftRole] = useState(role);

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [openPicker, setOpenPicker] = useState<PickerKind | null>(null);

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
    setDraftCountry(country || "IT");
    setDraftRegion(region);
    setDraftProvince(province);
    setDraftCity(city);
    setDraftSport(sport);
    setDraftCategory(category);
    setDraftRole(role);
  }, [country, region, province, city, sport, category, role]);

  useEffect(() => {
    let mounted = true;
    void getRegions().then((items) => {
      if (mounted) setRegions(items);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedRegion = useMemo(() => regions.find((item) => item.name === draftRegion) ?? null, [regions, draftRegion]);
  const selectedProvince = useMemo(
    () => provinces.find((item) => item.name === draftProvince) ?? null,
    [provinces, draftProvince],
  );

  useEffect(() => {
    let mounted = true;

    if (!selectedRegion) {
      setProvinces([]);
      setCities([]);
      return;
    }

    void getProvinces(selectedRegion.id).then((items) => {
      if (!mounted) return;
      setProvinces(items);
      if (!items.some((item) => item.name === draftProvince)) {
        setDraftProvince("");
        setDraftCity("");
        setCities([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, [selectedRegion?.id, draftProvince]);

  useEffect(() => {
    let mounted = true;

    if (!selectedProvince) {
      setCities([]);
      return;
    }

    void getMunicipalities(selectedProvince.id).then((items) => {
      if (!mounted) return;
      setCities(items);
      if (!items.some((item) => item.name === draftCity)) {
        setDraftCity("");
      }
    });

    return () => {
      mounted = false;
    };
  }, [selectedProvince?.id, draftCity]);

  useEffect(() => {
    if (draftCategory && !(CATEGORIES_BY_SPORT[draftSport] ?? []).includes(draftCategory)) setDraftCategory("");
    if (draftRole && !(SPORTS_ROLES[draftSport] ?? []).includes(draftRole)) setDraftRole("");
  }, [draftSport]);

  const query = useMemo(() => q.trim(), [q]);
  const categoriesForSport = useMemo(() => CATEGORIES_BY_SPORT[draftSport] ?? [], [draftSport]);
  const rolesForSport = useMemo(() => SPORTS_ROLES[draftSport] ?? [], [draftSport]);

  const activeLocation = useMemo(() => {
    if (city) return city;
    if (province) return province;
    if (region) return region;
    return legacyLocation;
  }, [city, legacyLocation, province, region]);

  const hasActiveFilters = useMemo(
    () => Boolean(sport || role || category || activeLocation || region || province || city),
    [sport, role, category, activeLocation, region, province, city],
  );

  const pickerOptions = useMemo<PickerOption[]>(() => {
    if (openPicker === "country") return COUNTRY_OPTIONS.map((item) => ({ label: item.label, value: item.value }));
    if (openPicker === "region") return regions.map((item) => ({ label: item.name, value: item.name }));
    if (openPicker === "province") return provinces.map((item) => ({ label: item.name, value: item.name }));
    if (openPicker === "city") return cities.map((item) => ({ label: item.name, value: item.name }));
    if (openPicker === "sport") return SPORTS.map((item) => ({ label: item, value: item }));
    if (openPicker === "category") return categoriesForSport.map((item) => ({ label: item, value: item }));
    if (openPicker === "role") return rolesForSport.map((item) => ({ label: item, value: item }));
    return [];
  }, [openPicker, regions, provinces, cities, categoriesForSport, rolesForSport]);

  const pickerTitle = useMemo(() => {
    const map: Record<PickerKind, string> = {
      country: "Seleziona paese",
      region: "Seleziona regione",
      province: "Seleziona provincia",
      city: "Seleziona città",
      sport: "Seleziona sport",
      category: "Seleziona categoria",
      role: "Seleziona ruolo",
    };
    return openPicker ? map[openPicker] : "Seleziona";
  }, [openPicker]);

  const updateUrl = useCallback(
    (
      next: Partial<{
        q: string;
        type: SearchKind;
        page: number;
        limit: number;
        sport: string;
        role: string;
        category: string;
        location: string;
        country: string;
        region: string;
        province: string;
        city: string;
      }>,
      mode: "push" | "replace" = "replace",
    ) => {
      const nextQ = normalizeFilterValue(next.q ?? q);
      const nextType = next.type ?? type;
      const nextPage = next.page ?? page;
      const nextLimit = next.limit ?? limit;
      const nextSport = normalizeFilterValue(next.sport ?? sport);
      const nextRole = normalizeFilterValue(next.role ?? role);
      const nextCategory = normalizeFilterValue(next.category ?? category);
      const nextCountry = normalizeFilterValue((next.country ?? country) || "IT");
      const nextRegion = normalizeFilterValue(next.region ?? region);
      const nextProvince = normalizeFilterValue(next.province ?? province);
      const nextCity = normalizeFilterValue(next.city ?? city);
      const locationSource = next.location !== undefined ? next.location : nextCity || nextProvince || nextRegion || legacyLocation;
      const nextLocation = normalizeFilterValue(locationSource);

      const sp = new URLSearchParams();
      if (nextQ) sp.set("q", nextQ);
      if (nextType !== "all") sp.set("type", nextType);
      if (nextPage !== 1) sp.set("page", String(nextPage));
      if (nextLimit !== 20) sp.set("limit", String(nextLimit));
      if (nextSport) sp.set("sport", nextSport);
      if (nextRole) sp.set("role", nextRole);
      if (nextCategory) sp.set("category", nextCategory);
      if (nextCountry && nextCountry !== "IT") sp.set("country", nextCountry);
      if (nextRegion) sp.set("region", nextRegion);
      if (nextProvince) sp.set("province", nextProvince);
      if (nextCity) sp.set("city", nextCity);
      if (nextLocation) sp.set("location", nextLocation);

      const target = sp.toString() ? `/search?${sp.toString()}` : "/search";
      if (mode === "push") router.push(target as any);
      else router.replace(target as any);
    },
    [category, city, country, legacyLocation, limit, page, province, q, region, role, router, sport, type],
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

      const response = await fetchSearchWithFilters({
        q: query,
        type,
        page,
        limit,
        sport,
        role,
        category,
        location: activeLocation,
        country,
        region,
        province,
        city,
      });
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
  }, [activeLocation, category, city, country, limit, page, province, query, region, role, sport, type]);

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
    const nextLocation = draftCity || draftProvince || draftRegion || "";
    updateUrl(
      {
        country: draftCountry,
        region: draftRegion,
        province: draftProvince,
        city: draftCity,
        location: nextLocation,
        sport: draftSport,
        category: draftCategory,
        role: draftRole,
        page: 1,
      },
      "push",
    );
  }, [draftCategory, draftCity, draftCountry, draftProvince, draftRegion, draftRole, draftSport, updateUrl]);

  const resetFilters = useCallback(() => {
    setDraftCountry("IT");
    setDraftRegion("");
    setDraftProvince("");
    setDraftCity("");
    setDraftSport("");
    setDraftCategory("");
    setDraftRole("");
    updateUrl(
      { country: "IT", region: "", province: "", city: "", location: "", sport: "", category: "", role: "", page: 1 },
      "push",
    );
  }, [updateUrl]);

  const selectValue = useCallback(
    (value: string) => {
      if (!openPicker) return;
      if (openPicker === "country") {
        setDraftCountry(value || "IT");
        setDraftRegion("");
        setDraftProvince("");
        setDraftCity("");
      }
      if (openPicker === "region") {
        setDraftRegion(value);
        setDraftProvince("");
        setDraftCity("");
      }
      if (openPicker === "province") {
        setDraftProvince(value);
        setDraftCity("");
      }
      if (openPicker === "city") setDraftCity(value);
      if (openPicker === "sport") {
        setDraftSport(value);
        setDraftCategory("");
        setDraftRole("");
      }
      if (openPicker === "category") setDraftCategory(value);
      if (openPicker === "role") setDraftRole(value);
      setOpenPicker(null);
    },
    [openPicker],
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
    <View
      key={`${item.kind}:${item.id}`}
      style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 14, gap: 6 }}
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
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 10 }}>
          <TextInput
            placeholder="Cerca..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onSubmitSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 12 }}
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

        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "800", fontSize: 16 }}>Filtri</Text>
            {hasActiveFilters ? (
              <Pressable onPress={resetFilters}>
                <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Reset</Text>
              </Pressable>
            ) : null}
          </View>

          <SelectField label="Paese" value={draftCountry} placeholder="Seleziona paese" onPress={() => setOpenPicker("country")} />
          <SelectField
            label="Regione"
            value={draftRegion}
            placeholder="Seleziona regione"
            disabled={draftCountry !== "IT"}
            onPress={() => setOpenPicker("region")}
          />
          <SelectField
            label="Provincia"
            value={draftProvince}
            placeholder="Seleziona provincia"
            disabled={!draftRegion}
            onPress={() => setOpenPicker("province")}
          />
          <SelectField
            label="Città"
            value={draftCity}
            placeholder="Seleziona città"
            disabled={!draftProvince}
            onPress={() => setOpenPicker("city")}
          />

          <SelectField label="Sport" value={draftSport} placeholder="Seleziona sport" onPress={() => setOpenPicker("sport")} />
          <SelectField
            label="Categoria"
            value={draftCategory}
            placeholder="Seleziona categoria"
            disabled={!draftSport}
            onPress={() => setOpenPicker("category")}
          />
          <SelectField
            label="Ruolo"
            value={draftRole}
            placeholder="Seleziona ruolo"
            disabled={!draftSport}
            onPress={() => setOpenPicker("role")}
          />

          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            Nota: il backend search usa principalmente il parametro location testuale. Regione/Provincia/Città guidano un inserimento più coerente ma la precisione finale dipende da /api/search.
          </Text>

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

        <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 10 }}>
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
                  style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12, alignItems: "center" }}
                >
                  {loadingMore ? <ActivityIndicator size="small" /> : <Text style={{ fontWeight: "700" }}>Carica altri</Text>}
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={Boolean(openPicker)} animationType="slide" transparent onRequestClose={() => setOpenPicker(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}>
          <View style={{ maxHeight: "70%", backgroundColor: theme.colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "800" }}>{pickerTitle}</Text>
              <Pressable onPress={() => setOpenPicker(null)}>
                <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Chiudi</Text>
              </Pressable>
            </View>

            <FlatList
              data={pickerOptions}
              keyExtractor={(item) => `${openPicker}:${item.value}`}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectValue(item.value)}
                  style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12, marginBottom: 8 }}
                >
                  <Text>{item.label}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ color: theme.colors.muted }}>Nessuna opzione disponibile</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
