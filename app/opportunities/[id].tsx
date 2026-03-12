import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { applyToOpportunity, fetchOpportunityById, useWebSession, useWhoami } from "../../src/lib/api";
import { deleteOpportunity } from "../../src/lib/opportunities/deleteOpportunity";
import { fetchMyAppliedOpportunityIds } from "../../src/lib/opportunities/fetchMyAppliedOpportunityIds";
import {
  formatOpportunityGenderLabel,
  getOpportunityClubInitial,
  resolveOpportunityClubAvatarUrl,
} from "../../src/lib/opportunities/ui";
import type { OpportunityDetail } from "../../src/types/opportunity";
import { theme } from "../../src/theme";

function asSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("it-IT");
}

function normalizeRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

function getClubProfileId(data: OpportunityDetail): string | null {
  const v =
    (data as any)?.club_id ??
    (data as any)?.club_profile_id ??
    (data as any)?.created_by ??
    (data as any)?.owner_id ??
    null;
  return v ? String(v) : null;
}


function getCurrentUserIds(data: any): string[] {
  const user = data?.user ?? {};
  return [data?.id, data?.user_id, data?.profile_id, user?.id, user?.user_id].map((x) => String(x ?? "").trim()).filter(Boolean);
}

function getOpportunityOwnerIds(data: OpportunityDetail): string[] {
  return [
    data.owner_id,
    data.created_by,
    data.club_id,
    data.club_profile_id,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
}
function formatLocation(opp: OpportunityDetail): string {
  return [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(" · ");
}

function formatCategory(opp: OpportunityDetail): string {
  return String(opp.category ?? opp.required_category ?? "").trim();
}

function formatAgeRange(ageMin?: number | null, ageMax?: number | null): string | null {
  if (typeof ageMin === "number" && typeof ageMax === "number") return `${ageMin}-${ageMax}`;
  if (typeof ageMin === "number") return `${ageMin}+`;
  if (typeof ageMax === "number") return `fino a ${ageMax}`;
  return null;
}

function Chip({ label }: { label: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
      <Text style={{ color: theme.colors.text, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export default function OpportunityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = asSingleValue(params.id).trim();

  const web = useWebSession();
  const whoami = useWhoami(web.ready);
  const role = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isPlayer = role === "player" || role === "athlete";

  const [item, setItem] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [checkingApplied, setCheckingApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const isLoading = loading || web.loading || whoami.loading;

  const clubProfileId = useMemo(() => (item ? getClubProfileId(item) : null), [item]);
  const isOwner = useMemo(() => {
    if (!item) return false;
    const ownerIds = getOpportunityOwnerIds(item);
    const currentIds = getCurrentUserIds(whoami.data);
    return ownerIds.some((candidate) => currentIds.includes(candidate));
  }, [item, whoami.data]);

  const load = useCallback(async () => {
    if (!id) {
      setError("ID opportunità non valido");
      setLoading(false);
      return;
    }

    setLoading(true);
    const response = await fetchOpportunityById(id);

    if (!response.ok || !response.data) {
      setError(response.errorText || "Errore nel caricamento dettaglio");
      setLoading(false);
      return;
    }

    setItem(response.data);
    setError(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const opportunityId = String(item?.id ?? "").trim();
    if (!opportunityId || !isPlayer || web.loading || whoami.loading) {
      setAlreadyApplied(false);
      return;
    }

    let mounted = true;
    const loadMyApplications = async () => {
      setCheckingApplied(true);
      const response = await fetchMyAppliedOpportunityIds({ status: "all" });

      if (!mounted) return;
      if (!response.ok || !response.data) {
        if (__DEV__) console.log("[opportunity-detail] fetchMyAppliedOpportunityIds failed", response.errorText);
        setAlreadyApplied(false);
        setCheckingApplied(false);
        return;
      }

      const applied = response.data.some((id) => id === opportunityId);
      setAlreadyApplied(applied);
      setCheckingApplied(false);
    };

    void loadMyApplications();

    return () => {
      mounted = false;
    };
  }, [item?.id, isPlayer, web.loading, whoami.loading]);

  const onApply = useCallback(async () => {
    if (!id || alreadyApplied || !isPlayer) return;

    setIsApplying(true);
    const response = await applyToOpportunity(id);

    if (response.ok || response.status === 409) {
      setAlreadyApplied(true);
    }

    setIsApplying(false);
  }, [alreadyApplied, id, isPlayer]);


  const onDelete = useCallback(() => {
    if (!id || !isOwner) return;

    Alert.alert("Elimina opportunità", "Questa azione non è reversibile. Vuoi continuare?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: () => {
          void (async () => {
            const response = await deleteOpportunity(id);
            if (!response.ok) {
              Alert.alert("Errore", response.errorText ?? "Eliminazione non riuscita");
              return;
            }
            Alert.alert("Opportunità eliminata", "L'opportunità è stata rimossa.", [
              { text: "OK", onPress: () => router.replace("/(tabs)/opportunities") },
            ]);
          })();
        },
      },
    ]);
  }, [id, isOwner, router]);

  if (!isLoading && (error || !item)) {
    return (
      <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Dettaglio opportunità</Text>
        <Text style={{ color: theme.colors.danger }}>{error || "Opportunità non trovata"}</Text>
        <Pressable onPress={() => void load()} style={{ borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" }}>
          <Text style={{ fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const ageRange = item ? formatAgeRange(item.age_min, item.age_max) : null;
  const location = item ? formatLocation(item) : "";
  const category = item ? formatCategory(item) : "";
  const genderLabel = formatOpportunityGenderLabel(item?.gender);
  const clubName = item?.club_name || item?.club_display_name || "Club";
  const clubAvatarUrl = resolveOpportunityClubAvatarUrl(item);
  const safeTitle = item?.title ?? "Caricamento…";
  const safeDesc = item?.description ?? "";
  const statusLine = isLoading
    ? "..."
    : `${(item?.status || "-").toUpperCase()} · Pubblicata il ${formatDate(item?.created_at)}`;

  return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 40, gap: 14 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 12,
          backgroundColor: theme.colors.neutral50,
          padding: 16,
          paddingTop: 18,
          gap: 12,
        }}
      >
        <Text style={{ color: theme.colors.text, opacity: 0.7, fontSize: 13, fontWeight: "700", marginTop: 2 }}>{statusLine}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {clubAvatarUrl ? (
            <Image
              source={{ uri: clubAvatarUrl }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.neutral100 }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.neutral100,
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
              }}
            >
              <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>{getOpportunityClubInitial(clubName)}</Text>
            </View>
          )}

          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{clubName}</Text>
        </View>

        <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>{safeTitle}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {item?.sport ? <Chip label={item.sport} /> : null}
          {category ? <Chip label={category} /> : <Chip label="Categoria non specificata" />}
          {item?.role ? <Chip label={item.role} /> : null}
          {genderLabel ? <Chip label={genderLabel} /> : null}
          {ageRange ? <Chip label={ageRange} /> : <Chip label="Età non specificata" />}
          {location ? <Chip label={location} /> : <Chip label="Località non specificata" />}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {!isLoading && clubProfileId ? (
            <Pressable
              onPress={() => router.push(`/clubs/${String(clubProfileId)}`)}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontWeight: "700", color: theme.colors.primary }}>Visita club</Text>
            </Pressable>
          ) : null}

          {!isLoading && isOwner ? (
            <Pressable
              onPress={() => router.push({ pathname: "/opportunities/[id]/edit", params: { id } })}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontWeight: "700", color: theme.colors.text }}>Modifica</Text>
            </Pressable>
          ) : null}

          {!isLoading && isOwner ? (
            <Pressable
              onPress={onDelete}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.danger,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontWeight: "700", color: theme.colors.danger }}>Elimina</Text>
            </Pressable>
          ) : null}

          {!isLoading && isPlayer ? (
            alreadyApplied ? (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: "#D1FAE5",
                  borderWidth: 1,
                  borderColor: "#34D399",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 170,
                }}
              >
                <Text style={{ color: "#065F46", fontWeight: "800" }}>Candidatura inviata</Text>
              </View>
            ) : (
              <Pressable
                disabled={isApplying || checkingApplied}
                onPress={() => {
                  void onApply();
                }}
                style={{
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: theme.colors.primary,
                  opacity: isApplying || checkingApplied ? 0.6 : 1,
                }}
              >
                <Text style={{ fontWeight: "700", color: theme.colors.background }}>
                  {isApplying ? "Invio..." : "Candidati"}
                </Text>
              </Pressable>
            )
          ) : (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                opacity: 0.7,
              }}
            >
              <Text style={{ fontWeight: "700", color: theme.colors.text }}>Candidati</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Descrizione</Text>
        <Text style={{ color: theme.colors.text, lineHeight: 22 }}>{safeDesc || "Nessuna descrizione disponibile."}</Text>
      </View>
      </ScrollView>
  );
}
