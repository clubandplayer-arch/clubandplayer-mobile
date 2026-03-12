import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { OpportunityUpsertForm } from "../../../src/components/opportunities/OpportunityUpsertForm";
import { fetchOpportunityById, useWebSession, useWhoami } from "../../../src/lib/api";
import { updateOpportunity } from "../../../src/lib/opportunities/updateOpportunity";
import type { CreateOpportunityPayload, OpportunityDetail } from "../../../src/types/opportunity";
import { theme } from "../../../src/theme";

function asSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

function getCurrentUserIds(data: any): string[] {
  const user = data?.user ?? {};
  return [data?.id, data?.user_id, data?.profile_id, user?.id, user?.user_id].map((x) => String(x ?? "").trim()).filter(Boolean);
}

function getOpportunityOwnerIds(opp: OpportunityDetail): string[] {
  return [opp.owner_id, opp.created_by, opp.club_id, opp.club_profile_id].map((x) => String(x ?? "").trim()).filter(Boolean);
}

export default function EditOpportunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = asSingleValue(params.id).trim();

  const web = useWebSession();
  const whoami = useWhoami(web.ready);
  const role = normalizeRole((whoami.data as { role?: unknown } | null)?.role);

  const [item, setItem] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setSubmitError("ID opportunità non valido");
      return;
    }
    setLoading(true);
    const response = await fetchOpportunityById(id);
    if (!response.ok || !response.data) {
      setSubmitError(response.errorText ?? "Errore caricamento opportunità");
      setLoading(false);
      return;
    }
    setItem(response.data);
    setSubmitError(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = useMemo(() => {
    if (!item) return false;
    const ownerIds = getOpportunityOwnerIds(item);
    const currentIds = getCurrentUserIds(whoami.data);
    return ownerIds.some((candidate) => currentIds.includes(candidate));
  }, [item, whoami.data]);

  const canEdit = role === "club" && isOwner;

  if (web.loading || whoami.loading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!canEdit || !item) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>Modifica non disponibile</Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
          Puoi modificare solo opportunità create dal tuo club.
        </Text>
        <Pressable onPress={() => router.back()} style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ fontWeight: "600" }}>Torna indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <OpportunityUpsertForm
      heading="Modifica opportunità"
      submitLabel="Salva modifiche"
      submitting={submitting}
      submitError={submitError}
      initialValues={{
        title: item.title ?? "",
        description: item.description ?? "",
        country: item.country ?? "IT",
        region: item.region ?? "",
        province: item.province ?? "",
        city: item.city ?? "",
        sport: item.sport ?? "Calcio",
        category: item.category ?? "",
        role: item.role ?? "",
        gender: item.gender ?? "",
        ageBracket: (item as any).age_bracket ?? "Indifferente",
      }}
      onSubmit={async (payload: CreateOpportunityPayload) => {
        setSubmitError(null);
        setSubmitting(true);
        const response = await updateOpportunity(id, payload);
        setSubmitting(false);

        if (!response.ok) {
          setSubmitError(response.errorText ?? "Aggiornamento opportunità non riuscito");
          return;
        }

        Alert.alert("Opportunità aggiornata", "Le modifiche sono state salvate.", [
          {
            text: "OK",
            onPress: () => router.replace({ pathname: "/opportunities/[id]", params: { id } }),
          },
        ]);
      }}
    />
  );
}
