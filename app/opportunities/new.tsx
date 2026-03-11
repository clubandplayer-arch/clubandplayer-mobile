import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { useWebSession, useWhoami } from "../../src/lib/api";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../src/lib/geo/location";
import {
  AGE_OPTIONS,
  CATEGORIES_BY_SPORT,
  GENDER_OPTIONS,
  SPORTS,
  SPORTS_ROLES,
} from "../../src/lib/opportunities/formOptions";
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

function OptionPills({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const active = option === selected;
        return (
          <Pressable
            key={option}
            disabled={disabled}
            onPress={() => onSelect(option)}
            style={{
              borderWidth: 1,
              borderColor: active ? theme.colors.primary : theme.colors.neutral200,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: active ? "rgba(14,165,233,0.12)" : theme.colors.background,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: active ? "700" : "500" }}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CreateOpportunityScreen() {
  const router = useRouter();
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country] = useState("IT");
  const [sport, setSport] = useState<string>("Calcio");
  const [category, setCategory] = useState("");
  const [role, setRole] = useState("");
  const [gender, setGender] = useState("");
  const [ageBracket, setAgeBracket] = useState<string>("Indifferente");

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";

  const categoriesForSport = CATEGORIES_BY_SPORT[sport] ?? [];
  const rolesForSport = SPORTS_ROLES[sport] ?? [];

  const selectedRegion = useMemo(() => regions.find((item) => item.name === region) ?? null, [region, regions]);
  const selectedProvince = useMemo(() => provinces.find((item) => item.name === province) ?? null, [province, provinces]);

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingRegions(true);
    void getRegions()
      .then((items) => {
        if (!cancelled) setRegions(items);
      })
      .finally(() => {
        if (!cancelled) setLoadingRegions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProvince("");
    setCity("");
    setCities([]);
    if (!selectedRegion) {
      setProvinces([]);
      return;
    }
    setLoadingProvinces(true);
    void getProvinces(selectedRegion.id)
      .then((items) => {
        if (!cancelled) setProvinces(items);
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRegion?.id]);

  useEffect(() => {
    let cancelled = false;
    setCity("");
    if (!selectedProvince) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    void getMunicipalities(selectedProvince.id)
      .then((items) => {
        if (!cancelled) setCities(items);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProvince?.id]);

  useEffect(() => {
    setCategory("");
    setRole("");
  }, [sport]);

  const onSubmit = async () => {
    if (formDisabled) return;

    if (!title.trim()) {
      setSubmitError("Titolo obbligatorio");
      return;
    }

    if (!gender.trim()) {
      setSubmitError("Genere obbligatorio");
      return;
    }

    if (rolesForSport.length > 0 && !role.trim()) {
      setSubmitError("Ruolo obbligatorio");
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
      category: asOptionalText(category),
      gender: asOptionalText(gender),
      age_bracket: ageBracket === "Indifferente" ? null : ageBracket,
      age_min: null,
      age_max: null,
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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 42 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Crea opportunità</Text>

      {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Titolo *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!formDisabled}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Descrizione</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!formDisabled}
          multiline
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 88 }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Sport *</Text>
        <OptionPills options={SPORTS} selected={sport} onSelect={setSport} disabled={formDisabled} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Categoria</Text>
        <OptionPills options={categoriesForSport} selected={category} onSelect={setCategory} disabled={formDisabled} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Ruolo {rolesForSport.length > 0 ? "*" : ""}</Text>
        <OptionPills options={rolesForSport} selected={role} onSelect={setRole} disabled={formDisabled} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Genere *</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {GENDER_OPTIONS.map((option) => {
            const active = gender === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setGender(option.value)}
                disabled={formDisabled}
                style={{
                  borderWidth: 1,
                  borderColor: active ? theme.colors.primary : theme.colors.neutral200,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  backgroundColor: active ? "rgba(14,165,233,0.12)" : theme.colors.background,
                  opacity: formDisabled ? 0.6 : 1,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: active ? "700" : "500" }}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Età</Text>
        <OptionPills options={AGE_OPTIONS} selected={ageBracket} onSelect={setAgeBracket} disabled={formDisabled} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Paese</Text>
        <TextInput value={country} editable={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.muted }} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Regione</Text>
        {loadingRegions ? <ActivityIndicator /> : <OptionPills options={regions.map((item) => item.name)} selected={region} onSelect={setRegion} disabled={formDisabled} />}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Provincia</Text>
        {loadingProvinces ? <ActivityIndicator /> : <OptionPills options={provinces.map((item) => item.name)} selected={province} onSelect={setProvince} disabled={formDisabled || !region} />}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Città</Text>
        {loadingCities ? <ActivityIndicator /> : <OptionPills options={cities.map((item) => item.name)} selected={city} onSelect={setCity} disabled={formDisabled || !province} />}
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
