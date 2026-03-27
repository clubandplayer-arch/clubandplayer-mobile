import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { devWarn } from "../../../src/lib/debug/devLog";
import {
  applyToOpportunity,
  fetchOpportunities,
  useWebSession,
  useWhoami,
} from "../../../src/lib/api";
import { fetchMyAppliedOpportunityIds } from "../../../src/lib/opportunities/fetchMyAppliedOpportunityIds";
import {
  formatOpportunityGenderLabel,
  getOpportunityClubInitial,
  resolveOpportunityClubAvatarUrl,
} from "../../../src/lib/opportunities/ui";
import type { Opportunity } from "../../../src/types/opportunity";
import { supabase } from "../../../src/lib/supabase";
import { theme } from "../../../src/theme";

function getClubProfileId(opp: Opportunity): string | null {
  return opp.club_id ?? opp.created_by ?? opp.owner_id ?? null;
}

function formatLocation(opp: Opportunity): string {
  return [opp.city, opp.province, opp.region].filter(Boolean).join(" · ");
}

function formatCategory(opp: Opportunity): string {
  return String(opp.category ?? opp.required_category ?? "").trim();
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT");
}

function formatAgeRange(ageMin?: number | null, ageMax?: number | null): string | null {
  if (typeof ageMin === "number" && typeof ageMax === "number") return `${ageMin}-${ageMax}`;
  if (typeof ageMin === "number") return `${ageMin}+`;
  if (typeof ageMax === "number") return `fino a ${ageMax}`;
  return null;
}

function Chip({ label }: { label: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ fontSize: 12, color: theme.colors.text }}>{label}</Text>
    </View>
  );
}

function normalizeRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

function getCurrentUserIds(data: any): string[] {
  const user = data?.user ?? {};
  return [data?.id, data?.user_id, data?.profile_id, user?.id, user?.user_id]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
}

function OpportunityCard({
  item,
  showApplyActions,
  alreadyApplied,
  note,
  applyError,
  isApplying,
  onChangeNote,
  onApply,
  clubAvatarUrl,
}: {
  item: Opportunity;
  showApplyActions: boolean;
  alreadyApplied: boolean;
  note: string;
  applyError: string | null;
  isApplying: boolean;
  onChangeNote: (value: string) => void;
  onApply: () => void;
  clubAvatarUrl: string | null;
}) {
  const router = useRouter();

  const clubProfileId = getClubProfileId(item);
  const location = formatLocation(item);
  const ageRange = formatAgeRange(item.age_min, item.age_max);
  const clubName = item.club_name || item.club_display_name || "Club";
  const category = formatCategory(item);
  const genderLabel = formatOpportunityGenderLabel(item.gender);

  const opportunityId = String(item.id ?? "").trim();

  const onOpenOpportunity = () => {
    if (!opportunityId) {
      console.warn("[opportunities] missing opportunity id", item);
      return;
    }
    router.push({ pathname: "/opportunities/[id]", params: { id: opportunityId } });
  };

  const onOpenClub = () => {
    if (!clubProfileId) return;
    router.push({ pathname: "/clubs/[id]", params: { id: String(clubProfileId) } });
  };

  return (
    <Pressable
      onPress={onOpenOpportunity}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        backgroundColor: theme.colors.background,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>{item.title || "Opportunità"}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {clubAvatarUrl ? (
          <Image
            source={{ uri: clubAvatarUrl }}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.neutral100 }}
          />
        ) : (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.neutral100,
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
            }}
          >
            <Text style={{ color: theme.colors.muted, fontWeight: "700", fontSize: 12 }}>{getOpportunityClubInitial(clubName)}</Text>
          </View>
        )}

        {clubProfileId ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onOpenClub();
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>{clubName}</Text>
          </Pressable>
        ) : (
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{clubName}</Text>
        )}
      </View>

      {location ? <Text style={{ color: theme.colors.muted }}>{location}</Text> : <Text style={{ color: theme.colors.muted }}>Località non specificata</Text>}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {item.sport ? <Chip label={item.sport} /> : null}
        {category ? <Chip label={category} /> : <Chip label="Categoria non specificata" />}
        {item.role ? <Chip label={item.role} /> : null}
        {genderLabel ? <Chip label={genderLabel} /> : null}
        {ageRange ? <Chip label={ageRange} /> : <Chip label="Età non specificata" />}
      </View>

      {!!item.description ? (
        <Text style={{ color: theme.colors.text }} numberOfLines={3}>
          {item.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: theme.colors.muted, textTransform: "capitalize" }}>{item.status || "-"}</Text>
        <Text style={{ color: theme.colors.muted }}>{formatDate(item.created_at)}</Text>
      </View>

      {showApplyActions ? (
        alreadyApplied ? (
          <View
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              backgroundColor: theme.colors.background,
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ fontWeight: "700", color: theme.colors.muted }}>Candidatura inviata</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <TextInput
              value={note}
              onChangeText={onChangeNote}
              placeholder="Nota (opzionale)"
              onPressIn={(event) => event.stopPropagation()}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
                minWidth: 220,
                color: theme.colors.text,
              }}
            />

            {applyError ? <Text style={{ color: theme.colors.danger }}>{applyError}</Text> : null}

            <Pressable
              disabled={isApplying}
              onPress={(event) => {
                event.stopPropagation();
                onApply();
              }}
              style={{
                alignSelf: "flex-start",
                borderRadius: 10,
                backgroundColor: theme.colors.primary,
                paddingVertical: 8,
                paddingHorizontal: 12,
                opacity: isApplying ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{isApplying ? "Invio..." : "Candidati"}</Text>
            </Pressable>
          </View>
        )
      ) : null}
    </Pressable>
  );
}

export default function OpportunitiesScreen() {
  const router = useRouter();
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [items, setItems] = useState<Opportunity[]>([]);
  const [clubAvatarById, setClubAvatarById] = useState<Record<string, string | null>>({});
  const [appliedOpportunityIds, setAppliedOpportunityIds] = useState<Set<string>>(new Set());
  const [notesByOpportunityId, setNotesByOpportunityId] = useState<Record<string, string>>({});
  const [errorsByOpportunityId, setErrorsByOpportunityId] = useState<Record<string, string | null>>({});
  const [actingOpportunityId, setActingOpportunityId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [onlyMine, setOnlyMine] = useState(false);
  const [mineServerFilterActive, setMineServerFilterActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = role === "club";
  const isPlayer = role === "player" || role === "athlete";
  const currentUserIds = useMemo(() => getCurrentUserIds(whoami.data), [whoami.data]);

  const clientFilteredItems = useMemo(() => {
    if (!isClub || !onlyMine) return items;
    return items.filter((opp) => {
      const ownerIds = [opp.owner_id, opp.created_by, opp.club_id]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      return ownerIds.some((candidate) => currentUserIds.includes(candidate));
    });
  }, [currentUserIds, isClub, items, onlyMine]);
  const visibleItems = clientFilteredItems;

  const canLoadMore = useMemo(() => page < pageCount, [page, pageCount]);

  const loadPage = useCallback(async (nextPage: number, mode: "replace" | "append") => {
    if (mode === "replace") setLoading(true);
    else setLoadingMore(true);

    const clubIdForServerFilter = isClub && onlyMine ? currentUserIds[0] ?? "" : "";
    const useServerMineFilter = isClub && onlyMine && !!clubIdForServerFilter;

    const response = await fetchOpportunities({
      page: nextPage,
      pageSize: 20,
      sort,
      q: query,
      clubId: useServerMineFilter ? clubIdForServerFilter : undefined,
    });

    if (!response.ok || !response.data) {
      setError(response.errorText || "Errore nel caricamento opportunità");
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    setMineServerFilterActive(useServerMineFilter);

    if (mode === "replace" && isPlayer) {
      const applicationsResponse = await fetchMyAppliedOpportunityIds({ status: "all" });
      if (applicationsResponse.ok && applicationsResponse.data) {
        setAppliedOpportunityIds(new Set(applicationsResponse.data));
      } else {
        devWarn("[opportunities] fetchMyAppliedOpportunityIds failed", {
          status: applicationsResponse.status,
          errorText: applicationsResponse.errorText,
        });
        setAppliedOpportunityIds(new Set());
      }
    }

    if (mode === "replace" && !isPlayer) {
      setAppliedOpportunityIds(new Set());
    }

    setPage(response.data.page || nextPage);
    setPageCount(response.data.pageCount || 1);
    setItems((prev) => (mode === "append" ? [...prev, ...response.data.data] : response.data.data));

    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, [isPlayer, query, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(queryInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    if (web.loading || whoami.loading) return;
    void loadPage(1, "replace");
  }, [loadPage, web.loading, whoami.loading]);

  useEffect(() => {
    const clubIds = Array.from(
      new Set(
        items
          .map((opp) => String(getClubProfileId(opp) ?? "").trim())
          .filter((id) => id.length > 0)
      )
    );

    const missingIds = clubIds.filter((id) => !(id in clubAvatarById));
    if (missingIds.length === 0) return;

    let mounted = true;
    const loadClubAvatars = async () => {
      const res = await supabase.from("profiles").select("id,avatar_url").in("id", missingIds);
      if (!mounted) return;

      if (res.error) {
        if (__DEV__) console.log("[opportunities] club avatar load error", res.error.message);
        setClubAvatarById((prev) => {
          const next = { ...prev };
          for (const id of missingIds) next[id] = prev[id] ?? null;
          return next;
        });
        return;
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      setClubAvatarById((prev) => {
        const next = { ...prev };
        for (const id of missingIds) next[id] = null;
        for (const row of rows as Array<{ id?: string | null; avatar_url?: string | null }>) {
          const id = String(row?.id ?? "").trim();
          if (!id) continue;
          const avatar = typeof row?.avatar_url === "string" && row.avatar_url.trim() ? row.avatar_url.trim() : null;
          next[id] = avatar;
        }
        return next;
      });
    };

    void loadClubAvatars();

    return () => {
      mounted = false;
    };
  }, [clubAvatarById, items]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadPage(1, "replace");
  }, [loadPage]);

  const onEndReached = useCallback(() => {
    if (!canLoadMore || loading || loadingMore) return;
    void loadPage(page + 1, "append");
  }, [canLoadMore, loadPage, loading, loadingMore, page]);

  const onApply = useCallback(async (opportunityId: string) => {
    if (!opportunityId) return;

    try {
      setActingOpportunityId(opportunityId);
      setErrorsByOpportunityId((prev) => ({ ...prev, [opportunityId]: null }));

      const response = await applyToOpportunity(opportunityId, notesByOpportunityId[opportunityId]);

      if (response.ok || response.status === 409) {
        setAppliedOpportunityIds((prev) => {
          const next = new Set(prev);
          next.add(opportunityId);
          return next;
        });

        setNotesByOpportunityId((prev) => {
          const next = { ...prev };
          delete next[opportunityId];
          return next;
        });

        setErrorsByOpportunityId((prev) => {
          const next = { ...prev };
          delete next[opportunityId];
          return next;
        });
        return;
      }

      const message = response.errorText || "Impossibile inviare candidatura";
      setErrorsByOpportunityId((prev) => ({ ...prev, [opportunityId]: message }));
    } finally {
      setActingOpportunityId(null);
    }
  }, [notesByOpportunityId]);

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
        <Text style={{ color: theme.colors.danger }}>{error}</Text>
        <Pressable
          onPress={() => void loadPage(1, "replace")}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 12,
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={visibleItems}
      ListHeaderComponent={
        <View style={{ marginBottom: 12, gap: 10 }}>
          <TextInput
            value={queryInput}
            onChangeText={setQueryInput}
            placeholder="Cerca opportunità"
            style={{
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.colors.text,
            }}
          />

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {isClub ? (
              <>
                <Pressable
                  onPress={() => router.push("/opportunities/new" as any)}
                  style={{
                    borderRadius: 999,
                    backgroundColor: theme.colors.primary,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Crea opportunità</Text>
                </Pressable>
                <Pressable
                  onPress={() => setOnlyMine((prev) => !prev)}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neutral200,
                    borderRadius: 999,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    backgroundColor: onlyMine ? theme.colors.text : theme.colors.background,
                  }}
                >
                  <Text style={{ color: onlyMine ? theme.colors.background : theme.colors.text, fontWeight: "700" }}>
                    {onlyMine ? "Le mie: ON" : "Le mie"}
                  </Text>
                </Pressable>
              </>
            ) : null}
            {[
              { key: "recent", label: "Più recenti" },
              { key: "oldest", label: "Meno recenti" },
            ].map((option) => {
              const active = sort === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSort(option.key as "recent" | "oldest")}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neutral200,
                    borderRadius: 999,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    backgroundColor: active ? theme.colors.text : theme.colors.background,
                  }}
                >
                  <Text style={{ color: active ? theme.colors.background : theme.colors.text, fontWeight: "700" }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {isClub && onlyMine && !mineServerFilterActive ? (
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              Filtro “Le mie” in fallback client-side: i risultati possono essere incompleti con paginazione server.
            </Text>
          ) : null}
        </View>
      }
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => {
        const opportunityId = String(item.id ?? "").trim();
        const alreadyApplied = appliedOpportunityIds.has(opportunityId);

        const clubProfileId = String(getClubProfileId(item) ?? "").trim();
        const profileAvatar = clubProfileId ? clubAvatarById[clubProfileId] ?? null : null;

        return (
          <OpportunityCard
            item={item}
            showApplyActions={isPlayer}
            alreadyApplied={alreadyApplied}
            note={notesByOpportunityId[opportunityId] ?? ""}
            applyError={errorsByOpportunityId[opportunityId] ?? null}
            isApplying={actingOpportunityId === opportunityId}
            clubAvatarUrl={profileAvatar ?? resolveOpportunityClubAvatarUrl(item)}
            onChangeNote={(value) => {
              setNotesByOpportunityId((prev) => ({ ...prev, [opportunityId]: value }));
              setErrorsByOpportunityId((prev) => ({ ...prev, [opportunityId]: null }));
            }}
            onApply={() => void onApply(opportunityId)}
          />
        );
      }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      ListEmptyComponent={
        <Text style={{ color: theme.colors.muted }}>
          {query ? "Nessuna opportunità trovata con i filtri attuali." : "Nessuna opportunità disponibile."}
        </Text>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReachedThreshold={0.35}
      onEndReached={onEndReached}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
    />
  );
}
