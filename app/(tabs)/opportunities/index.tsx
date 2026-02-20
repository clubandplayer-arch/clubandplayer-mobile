import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { devWarn } from "../../../src/lib/debug/devLog";
import { applyToOpportunity, fetchMyApplications, fetchOpportunities, useWebSession, useWhoami } from "../../../src/lib/api";
import type { Opportunity } from "../../../src/types/opportunity";
import { theme } from "../../../src/theme";

function getClubProfileId(opp: Opportunity): string | null {
  return opp.club_id ?? opp.created_by ?? opp.owner_id ?? null;
}

function formatLocation(opp: Opportunity): string {
  return [opp.city, opp.province, opp.region].filter(Boolean).join(" · ");
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

function OpportunityCard({
  item,
  showApplyActions,
  alreadyApplied,
  note,
  applyError,
  isApplying,
  onChangeNote,
  onApply,
}: {
  item: Opportunity;
  showApplyActions: boolean;
  alreadyApplied: boolean;
  note: string;
  applyError: string | null;
  isApplying: boolean;
  onChangeNote: (value: string) => void;
  onApply: () => void;
}) {
  const router = useRouter();

  const clubProfileId = getClubProfileId(item);
  const location = formatLocation(item);
  const ageRange = formatAgeRange(item.age_min, item.age_max);

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

      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
        {clubProfileId ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onOpenClub();
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>{item.club_name || "Club"}</Text>
          </Pressable>
        ) : (
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{item.club_name || "Club"}</Text>
        )}
        {location ? <Text style={{ color: theme.colors.muted }}>· {location}</Text> : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {item.sport ? <Chip label={item.sport} /> : null}
        {item.role ? <Chip label={item.role} /> : null}
        {ageRange ? <Chip label={ageRange} /> : null}
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
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [items, setItems] = useState<Opportunity[]>([]);
  const [appliedOpportunityIds, setAppliedOpportunityIds] = useState<Set<string>>(new Set());
  const [notesByOpportunityId, setNotesByOpportunityId] = useState<Record<string, string>>({});
  const [errorsByOpportunityId, setErrorsByOpportunityId] = useState<Record<string, string | null>>({});
  const [actingOpportunityId, setActingOpportunityId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = role === "club";
  const isPlayer = !isClub;

  const canLoadMore = useMemo(() => page < pageCount, [page, pageCount]);

  const loadPage = useCallback(async (nextPage: number, mode: "replace" | "append") => {
    if (mode === "replace") setLoading(true);
    else setLoadingMore(true);

    const response = await fetchOpportunities({ page: nextPage, pageSize: 20, sort: "recent" });

    if (!response.ok || !response.data) {
      setError(response.errorText || "Errore nel caricamento opportunità");
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      return;
    }

    setError(null);

    if (mode === "replace" && isPlayer) {
      const applicationsResponse = await fetchMyApplications({ status: "all" });
      if (applicationsResponse.ok && applicationsResponse.data) {
        const nextAppliedIds = new Set(
          applicationsResponse.data
            .map((application) => String(application.opportunity_id ?? "").trim())
            .filter(Boolean),
        );
        setAppliedOpportunityIds(nextAppliedIds);
      } else {
        devWarn("[opportunities] fetchMyApplications failed", {
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
  }, [isPlayer]);

  useEffect(() => {
    if (web.loading || whoami.loading) return;
    void loadPage(1, "replace");
  }, [loadPage, web.loading, whoami.loading]);

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
      Alert.alert("Errore", message);
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
        <Text style={{ fontSize: 22, fontFamily: "Righteous", color: theme.colors.primary }}>Opportunità</Text>
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
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => {
        const opportunityId = String(item.id ?? "").trim();
        const alreadyApplied = appliedOpportunityIds.has(opportunityId);

        return (
          <OpportunityCard
            item={item}
            showApplyActions={isPlayer}
            alreadyApplied={alreadyApplied}
            note={notesByOpportunityId[opportunityId] ?? ""}
            applyError={errorsByOpportunityId[opportunityId] ?? null}
            isApplying={actingOpportunityId === opportunityId}
            onChangeNote={(value) => {
              setNotesByOpportunityId((prev) => ({ ...prev, [opportunityId]: value }));
              setErrorsByOpportunityId((prev) => ({ ...prev, [opportunityId]: null }));
            }}
            onApply={() => void onApply(opportunityId)}
          />
        );
      }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      ListEmptyComponent={<Text style={{ color: theme.colors.muted }}>Nessuna opportunità disponibile.</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReachedThreshold={0.35}
      onEndReached={onEndReached}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 10 }} /> : null}
    />
  );
}
