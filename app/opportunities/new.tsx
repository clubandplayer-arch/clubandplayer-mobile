import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View, type AlertButton } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchOpportunities, useWebSession, useWhoami } from "../../src/lib/api";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../src/lib/geo/location";
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

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((item) => String(item ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

function sanitizeAgeInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
  if (!digits) return "";
  const parsed = Number(digits);
  if (!Number.isFinite(parsed)) return "";
  if (parsed < 5) return "5";
  if (parsed > 70) return "70";
  return String(parsed);
}

function openSelectSheet(params: {
  title: string;
  options: string[];
  onSelect: (value: string) => void;
  allowClear?: boolean;
}) {
  const buttons: AlertButton[] = params.options.slice(0, 10).map((option) => ({ text: option, onPress: () => params.onSelect(option) }));
  if (params.allowClear) buttons.unshift({ text: "Nessuno", onPress: () => params.onSelect("") });
  buttons.push({ text: "Annulla", style: "cancel" as const });
  Alert.alert(params.title, undefined, buttons);
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
  const [requiredCategory, setRequiredCategory] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("open");

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);

  const [sportOptions, setSportOptions] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [requiredCategoryOptions, setRequiredCategoryOptions] = useState<string[]>([]);
  const [genderOptions, setGenderOptions] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  useEffect(() => {
    let active = true;
    void getRegions().then((items) => {
      if (!active) return;
      setRegions(items);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const selectedRegion = regions.find((item) => item.name === region) ?? null;
    let active = true;

    setProvince("");
    setCity("");
    setMunicipalities([]);

    if (!selectedRegion?.id) {
      setProvinces([]);
      return;
    }

    void getProvinces(selectedRegion.id).then((items) => {
      if (!active) return;
      setProvinces(items);
    });

    return () => {
      active = false;
    };
  }, [region, regions]);

  useEffect(() => {
    const selectedProvince = provinces.find((item) => item.name === province) ?? null;
    let active = true;

    setCity("");
    if (!selectedProvince?.id) {
      setMunicipalities([]);
      return;
    }

    void getMunicipalities(selectedProvince.id).then((items) => {
      if (!active) return;
      setMunicipalities(items);
    });

    return () => {
      active = false;
    };
  }, [province, provinces]);

  useEffect(() => {
    let active = true;
    void fetchOpportunities({ page: 1, pageSize: 200, sort: "recent" }).then((res) => {
      if (!active || !res.ok || !res.data?.data?.length) return;
      const items = res.data.data;
      setSportOptions(uniqueSorted(items.map((item) => item.sport)));
      setRoleOptions(uniqueSorted(items.map((item) => item.role)));
      setRequiredCategoryOptions(uniqueSorted(items.map((item) => item.required_category ?? item.category)));
      setGenderOptions(uniqueSorted(items.map((item) => item.gender)));
      setStatusOptions(uniqueSorted(items.map((item) => item.status)));
    });
    return () => {
      active = false;
    };
  }, []);

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
    if (ageMinValue !== null && (ageMinValue < 5 || ageMinValue > 70)) {
      setSubmitError("Età minima deve essere tra 5 e 70");
      return;
    }
    if (ageMaxValue !== null && (ageMaxValue < 5 || ageMaxValue > 70)) {
      setSubmitError("Età massima deve essere tra 5 e 70");
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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: Math.max(84, insets.bottom + 64) }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>
      <Text style={{ color: theme.colors.muted }}>Compila i campi allineati al payload web POST /api/opportunities.</Text>

      {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Titolo *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!formDisabled}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Descrizione</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!formDisabled}
          multiline
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, minHeight: 90 }}
        />
      </View>

      {[
        { label: "Country", value: country, onPress: () => openSelectSheet({ title: "Country", options: ["IT"], onSelect: setCountry }) },
        { label: "Regione", value: region, onPress: () => openSelectSheet({ title: "Regione", options: regions.map((item) => item.name), onSelect: setRegion, allowClear: true }) },
        { label: "Provincia", value: province, onPress: () => openSelectSheet({ title: "Provincia", options: provinces.map((item) => item.name), onSelect: setProvince, allowClear: true }) },
        { label: "Città", value: city, onPress: () => openSelectSheet({ title: "Città", options: municipalities.map((item) => item.name), onSelect: setCity, allowClear: true }) },
        { label: "Sport", value: sport, onPress: () => openSelectSheet({ title: "Sport", options: sportOptions, onSelect: setSport, allowClear: true }) },
        { label: "Ruolo", value: role, onPress: () => openSelectSheet({ title: "Ruolo", options: roleOptions, onSelect: setRole, allowClear: true }) },
        { label: "Categoria richiesta", value: requiredCategory, onPress: () => openSelectSheet({ title: "Categoria richiesta", options: requiredCategoryOptions, onSelect: setRequiredCategory, allowClear: true }) },
        { label: "Gender", value: gender, onPress: () => openSelectSheet({ title: "Gender", options: genderOptions, onSelect: setGender, allowClear: true }) },
        { label: "Status", value: status, onPress: () => openSelectSheet({ title: "Status", options: statusOptions.length ? statusOptions : ["open"], onSelect: setStatus }) },
      ].map((field) => (
        <View key={field.label} style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>{field.label}</Text>
          <Pressable
            disabled={formDisabled}
            onPress={field.onPress}
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, opacity: formDisabled ? 0.6 : 1 }}
          >
            <Text style={{ color: field.value ? theme.colors.text : theme.colors.muted }}>{field.value || "Seleziona"}</Text>
          </Pressable>
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Età minima</Text>
          <TextInput
            value={ageMin}
            keyboardType="numeric"
            onChangeText={(value) => setAgeMin(sanitizeAgeInput(value))}
            editable={!formDisabled}
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }}
          />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Età massima</Text>
          <TextInput
            value={ageMax}
            keyboardType="numeric"
            onChangeText={(value) => setAgeMax(sanitizeAgeInput(value))}
            editable={!formDisabled}
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }}
          />
        </View>
      </View>

      <Pressable
        disabled={formDisabled}
        onPress={() => void onSubmit()}
        style={{ marginTop: 8, borderRadius: 10, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 12, alignItems: "center", opacity: formDisabled ? 0.6 : 1 }}
      >
        <Text style={{ color: theme.colors.background, fontWeight: "800" }}>
          {submitting ? "Pubblicazione in corso..." : "Pubblica opportunità"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
