import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWebSession, useWhoami } from "../../src/lib/api";
import {
  AGE_BRACKETS,
  CATEGORIES_BY_SPORT,
  COUNTRIES,
  OPPORTUNITY_GENDER_LABELS,
  SPORTS,
  SPORTS_ROLES,
  type OpportunitySport,
} from "../../src/constants/opportunities";
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

function parseAgeBracket(ageBracket: string): { min: number | null; max: number | null } {
  const normalized = ageBracket.trim().toUpperCase();
  if (!normalized) return { min: null, max: null };
  if (normalized === "SENIOR") return { min: 22, max: null };
  if (/^U\d+$/.test(normalized)) {
    const ceiling = Number(normalized.slice(1));
    if (Number.isFinite(ceiling)) return { min: null, max: ceiling };
  }
  return { min: null, max: null };
}

function SelectList({
  label,
  options,
  value,
  onSelect,
  disabled,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onSelect: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "600", color: theme.colors.text }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              disabled={disabled}
              onPress={() => onSelect(option)}
              style={{
                borderWidth: 1,
                borderColor: selected ? theme.colors.primary : theme.colors.neutral200,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: selected ? theme.colors.primary : theme.colors.background,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Text style={{ color: selected ? theme.colors.background : theme.colors.text, fontWeight: "600" }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CreateOpportunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState<string>(COUNTRIES[0] ?? "IT");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [role, setRole] = useState("");
  const [category, setCategory] = useState("");
  const [ageBracket, setAgeBracket] = useState("");
  const [gender, setGender] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  const sportRoles = useMemo(() => {
    if (!sport) return [];
    return SPORTS_ROLES[sport as OpportunitySport] ?? [];
  }, [sport]);

  const sportCategories = useMemo(() => {
    if (!sport) return [];
    return CATEGORIES_BY_SPORT[sport as OpportunitySport] ?? [];
  }, [sport]);

  const onSubmit = async () => {
    if (formDisabled) return;

    if (!title.trim()) {
      setSubmitError("Titolo obbligatorio");
      return;
    }

    if (!gender.trim()) {
      setSubmitError("Gender obbligatorio");
      return;
    }

    if (!ageBracket.trim()) {
      setSubmitError("Fascia età obbligatoria");
      return;
    }

    const { min: ageMin, max: ageMax } = parseAgeBracket(ageBracket);

    const payload: CreateOpportunityPayload = {
      title: title.trim(),
      description: asOptionalText(description),
      country: asOptionalText(country),
      region: asOptionalText(region),
      province: asOptionalText(province),
      city: asOptionalText(city),
      sport: asOptionalText(sport),
      role: asOptionalText(role),
      category: asOptionalText(category),
      age_bracket: asOptionalText(ageBracket),
      age_min: ageMin,
      age_max: ageMax,
      gender: asOptionalText(gender),
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
          router.replace("/opportunities");
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

  const isItaly = country === "IT";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: Math.max(insets.bottom + 96, 140) }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>
      <Text style={{ color: theme.colors.muted }}>Compila i campi allineati al payload web POST /api/opportunities.</Text>

      {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Titolo *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
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

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Descrizione</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!formDisabled}
          multiline
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.colors.text,
            minHeight: 88,
            textAlignVertical: "top",
          }}
        />
      </View>

      <SelectList label="Country" options={COUNTRIES} value={country} onSelect={setCountry} disabled={formDisabled} />

      {isItaly ? (
        <>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Regione</Text>
            <TextInput value={region} onChangeText={setRegion} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Provincia</Text>
            <TextInput value={province} onChangeText={setProvince} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Città</Text>
            <TextInput value={city} onChangeText={setCity} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
        </>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Regione (free text)</Text>
            <TextInput value={region} onChangeText={setRegion} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Provincia (free text)</Text>
            <TextInput value={province} onChangeText={setProvince} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Città (free text)</Text>
            <TextInput value={city} onChangeText={setCity} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
        </>
      )}

      <SelectList
        label="Sport"
        options={SPORTS}
        value={sport}
        onSelect={(next) => {
          setSport(next);
          setRole("");
          setCategory("");
        }}
        disabled={formDisabled}
      />

      {sportRoles.length > 0 ? (
        <SelectList label="Ruolo" options={sportRoles} value={role} onSelect={setRole} disabled={formDisabled} />
      ) : null}

      {sportCategories.length > 0 ? (
        <SelectList label="Categoria" options={sportCategories} value={category} onSelect={setCategory} disabled={formDisabled} />
      ) : null}

      <SelectList label="Fascia età *" options={AGE_BRACKETS} value={ageBracket} onSelect={setAgeBracket} disabled={formDisabled} />
      <SelectList label="Gender *" options={OPPORTUNITY_GENDER_LABELS} value={gender} onSelect={setGender} disabled={formDisabled} />

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
