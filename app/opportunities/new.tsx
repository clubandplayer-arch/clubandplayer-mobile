import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { OpportunityUpsertForm } from "../../src/components/opportunities/OpportunityUpsertForm";
import { useWebSession, useWhoami } from "../../src/lib/api";
import { createOpportunity } from "../../src/lib/opportunities/createOpportunity";
import type { CreateOpportunityPayload } from "../../src/types/opportunity";
import { theme } from "../../src/theme";

function normalizeRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

export default function CreateOpportunityScreen() {
  const router = useRouter();
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  const onSubmit = async (payload: CreateOpportunityPayload) => {
    if (formDisabled) return;

    setSubmitError(null);
    setSubmitting(true);
    const response = await createOpportunity(payload);
    setSubmitting(false);

    if (!response.ok || !response.data) {
      setSubmitError(response.errorText ?? "Creazione opportunità non riuscita");
      return;
    }

    Alert.alert("Opportunità creata", "La tua opportunità è stata pubblicata.", [
      {
        text: "OK",
        onPress: () => {
          const id = String(response.data?.id ?? "").trim();
          if (id) {
            router.replace({ pathname: "/opportunities/[id]", params: { id } });
            return;
          }
          router.replace("/(tabs)/opportunities");
        },
      },
    ]);
  };

  if (web.loading || whoami.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (web.error || whoami.error || !isClub) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>Accesso riservato ai club</Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
          Questa schermata replica /opportunities/new ed è disponibile solo per account club autenticati.
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/opportunities")}
          style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ fontWeight: "600" }}>Torna alle opportunità</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <OpportunityUpsertForm
      heading="Crea opportunità"
      submitLabel="Pubblica opportunità"
      submitting={submitting}
      submitError={submitError}
      initialValues={{ country: "IT", sport: "Calcio", ageBracket: "Indifferente" }}
      onSubmit={onSubmit}
    />
  );
}
