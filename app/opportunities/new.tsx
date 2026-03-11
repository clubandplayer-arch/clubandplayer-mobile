import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWebSession, useWhoami } from "../../src/lib/api";
import {
  AGE_BRACKETS,
  ageBracketToRange,
  CATEGORIES_BY_SPORT,
  COUNTRIES,
  GENDERS,
  SPORTS,
  SPORTS_ROLES,
} from "../../src/constants/opportunities";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../src/lib/geo/location";
import { createOpportunity } from "../../src/lib/opportunities/createOpportunity";
import type { CreateOpportunityPayload } from "../../src/types/opportunity";
import { theme } from "../../src/theme";

function normalizeRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

function OptionButtons({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={{
              borderWidth: 1,
              borderColor: active ? theme.colors.primary : theme.colors.neutral200,
              backgroundColor: active ? "#F0F7FF" : theme.colors.background,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: theme.colors.text }}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CreateOpportunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [category, setCategory] = useState("");
  const [ageBracket, setAgeBracket] = useState<(typeof AGE_BRACKETS)[number] | "">("");
  const [gender, setGender] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";
  const isItaly = country === "IT";

  useEffect(() => {
    if (!isItaly) {
      setRegions([]);
      setProvinces([]);
      setCities([]);
      return;
    }
    void getRegions().then(setRegions);
  }, [isItaly]);

  useEffect(() => {
    if (!isItaly) return;
    const selectedRegion = regions.find((item) => item.name === region);
    if (!selectedRegion) {
      setProvinces([]);
      return;
    }
    void getProvinces(selectedRegion.id).then(setProvinces);
  }, [isItaly, region, regions]);

  useEffect(() => {
    if (!isItaly) return;
    const selectedProvince = provinces.find((item) => item.name === province);
    if (!selectedProvince) {
      setCities([]);
      return;
    }
    void getMunicipalities(selectedProvince.id).then(setCities);
  }, [isItaly, province, provinces]);

  useEffect(() => {
    setRole("");
    setCategory("");
  }, [sport]);

  const roles = sport ? SPORTS_ROLES[sport as (typeof SPORTS)[number]] ?? [] : [];
  const categories = sport ? CATEGORIES_BY_SPORT[sport as (typeof SPORTS)[number]] ?? [] : [];

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  const onSubmit = async () => {
    if (!title.trim()) return setSubmitError("Titolo obbligatorio");
    if (!gender) return setSubmitError("Gender obbligatorio");
    if (sport === "Calcio" && !role) return setSubmitError("Ruolo obbligatorio per Calcio");

    const ageRange = ageBracketToRange(ageBracket);
    const payload: CreateOpportunityPayload = {
      title: title.trim(),
      description: description.trim() || null,
      country,
      region: region.trim() || null,
      province: province.trim() || null,
      city: city.trim() || null,
      sport: sport || null,
      role: role || null,
      required_category: category || null,
      age_bracket: ageBracket || null,
      age_min: ageRange.age_min,
      age_max: ageRange.age_max,
      gender,
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
        onPress: () => router.replace("/opportunities"),
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
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 140 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>
      {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

      <TextInput value={title} onChangeText={setTitle} editable={!formDisabled} placeholder="Titolo *" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }} />
      <TextInput value={description} onChangeText={setDescription} editable={!formDisabled} placeholder="Descrizione" multiline style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 90, textAlignVertical: "top" }} />

      <Text style={{ fontWeight: "700", color: theme.colors.text }}>Paese</Text>
      <OptionButtons options={COUNTRIES.map((item) => item.value)} value={country} onChange={setCountry} />

      {isItaly ? (
        <>
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Regione</Text>
          <OptionButtons options={regions.map((item) => item.name)} value={region} onChange={setRegion} />
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Provincia</Text>
          <OptionButtons options={provinces.map((item) => item.name)} value={province} onChange={setProvince} />
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Città</Text>
          <OptionButtons options={cities.map((item) => item.name)} value={city} onChange={setCity} />
        </>
      ) : (
        <>
          <TextInput value={region} onChangeText={setRegion} editable={!formDisabled} placeholder="Regione" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }} />
          <TextInput value={province} onChangeText={setProvince} editable={!formDisabled} placeholder="Provincia" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }} />
          <TextInput value={city} onChangeText={setCity} editable={!formDisabled} placeholder="Città" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }} />
        </>
      )}

      <Text style={{ fontWeight: "700", color: theme.colors.text }}>Sport</Text>
      <OptionButtons options={SPORTS} value={sport} onChange={setSport} />

      <Text style={{ fontWeight: "700", color: theme.colors.text }}>Ruolo</Text>
      <OptionButtons options={roles} value={role} onChange={setRole} />

      <Text style={{ fontWeight: "700", color: theme.colors.text }}>Categoria</Text>
      <OptionButtons options={categories} value={category} onChange={setCategory} />

      <Text style={{ fontWeight: "700", color: theme.colors.text }}>Fascia età</Text>
      <OptionButtons options={AGE_BRACKETS} value={ageBracket} onChange={(v) => setAgeBracket(v as (typeof AGE_BRACKETS)[number])} />

      <Text style={{ fontWeight: "700", color: theme.colors.text }}>Gender *</Text>
      <OptionButtons options={GENDERS.map((item) => item.label)} value={GENDERS.find((item) => item.value === gender)?.label ?? ""} onChange={(label) => setGender(GENDERS.find((item) => item.label === label)?.value ?? "")} />

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
        <Text style={{ color: theme.colors.background, fontWeight: "800" }}>{submitting ? "Pubblicazione in corso..." : "Pubblica opportunità"}</Text>
      </Pressable>
    </ScrollView>
  );
}
