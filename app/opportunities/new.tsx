import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { useWebSession, useWhoami } from "../../src/lib/api";
import { createOpportunity } from "../../src/lib/opportunities/createOpportunity";
import type { CreateOpportunityPayload } from "../../src/types/opportunity";
import { theme } from "../../src/theme";

function normalizeRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

function asOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function asOptionalNumber(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function CreateOpportunityScreen() {
  const router = useRouter();
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("IT");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [role, setRole] = useState("");
  const [requiredCategory, setRequiredCategory] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("open");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  const onSubmit = async () => {
    if (formDisabled) return;

    if (!title.trim()) {
      setSubmitError("Titolo obbligatorio");
      return;
    }

    const ageMinValue = asOptionalNumber(ageMin);
    const ageMaxValue = asOptionalNumber(ageMax);
    if (ageMin.trim() && ageMinValue === null) {
      setSubmitError("Età minima non valida");
      return;
    }
    if (ageMax.trim() && ageMaxValue === null) {
      setSubmitError("Età massima non valida");
      return;
    }
    if (ageMinValue !== null && ageMaxValue !== null && ageMinValue > ageMaxValue) {
      setSubmitError("Età minima non può superare età massima");
      return;
    }

    const payload: CreateOpportunityPayload = {
      title: title.trim(),
      description: asOptionalText(description),
      country: asOptionalText(country),
      region: asOptionalText(region),
      province: asOptionalText(province),
      city: asOptionalText(city),
      sport: asOptionalText(sport),
      role: asOptionalText(role),
      required_category: asOptionalText(requiredCategory),
      age_min: ageMinValue,
      age_max: ageMaxValue,
      gender: asOptionalText(gender),
      status: asOptionalText(status),
    };

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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 42 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>
      <Text style={{ color: theme.colors.muted }}>Compila i campi allineati al payload web POST /api/opportunities.</Text>

      {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

      {[
        ["Titolo *", title, setTitle],
        ["Descrizione", description, setDescription],
        ["Country", country, setCountry],
        ["Regione", region, setRegion],
        ["Provincia", province, setProvince],
        ["Città", city, setCity],
        ["Sport", sport, setSport],
        ["Ruolo", role, setRole],
        ["Categoria richiesta", requiredCategory, setRequiredCategory],
        ["Gender", gender, setGender],
        ["Status", status, setStatus],
      ].map(([label, value, setter]) => (
        <View key={label as string} style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>{label as string}</Text>
          <TextInput
            value={value as string}
            onChangeText={setter as (value: string) => void}
            editable={!formDisabled}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.colors.text,
            }}
          />
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Età minima</Text>
          <TextInput
            value={ageMin}
            keyboardType="numeric"
            onChangeText={setAgeMin}
            editable={!formDisabled}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.colors.text,
            }}
          />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Età massima</Text>
          <TextInput
            value={ageMax}
            keyboardType="numeric"
            onChangeText={setAgeMax}
            editable={!formDisabled}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.colors.text,
            }}
          />
        </View>
      </View>

      <Pressable
        disabled={formDisabled}
        onPress={() => void onSubmit()}
        style={{
          marginTop: 8,
          borderRadius: 10,
          backgroundColor: theme.colors.primary,
          paddingHorizontal: 14,
          paddingVertical: 12,
          alignItems: "center",
          opacity: formDisabled ? 0.6 : 1,
        }}
      >
        <Text style={{ color: theme.colors.background, fontWeight: "800" }}>
          {submitting ? "Pubblicazione in corso..." : "Pubblica opportunità"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
