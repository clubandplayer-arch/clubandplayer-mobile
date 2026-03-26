import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../lib/geo/location";
import { AGE_OPTIONS, CATEGORIES_BY_SPORT, GENDER_OPTIONS, SPORTS, SPORTS_ROLES } from "../../lib/opportunities/formOptions";
import { rangeFromAgeBracket } from "../../lib/opportunities/ageRange";
import type { CreateOpportunityPayload } from "../../types/opportunity";
import { theme } from "../../theme";

const COUNTRY_OPTIONS = [{ label: "Italia (IT)", value: "IT" }];

type FormValues = {
  title: string;
  description: string;
  country: string;
  region: string;
  province: string;
  city: string;
  sport: string;
  category: string;
  role: string;
  gender: string;
  ageBracket: string;
};

type Props = {
  heading: string;
  submitLabel: string;
  submitError: string | null;
  submitting: boolean;
  initialValues?: Partial<FormValues>;
  onSubmit: (payload: CreateOpportunityPayload) => Promise<void>;
};

type PickerKind = "country" | "region" | "province" | "city" | "sport" | "category" | "role" | "gender" | "age";

type StringOption = { label: string; value: string };

function SelectField({ label, value, placeholder, disabled, onPress }: { label: string; value: string; placeholder: string; disabled?: boolean; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "600", color: theme.colors.text }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: disabled ? theme.colors.neutral100 : theme.colors.background,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder}</Text>
      </Pressable>
    </View>
  );
}

export function OpportunityUpsertForm({ heading, submitLabel, submitError, submitting, initialValues, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [country, setCountry] = useState(initialValues?.country ?? "IT");
  const [region, setRegion] = useState(initialValues?.region ?? "");
  const [province, setProvince] = useState(initialValues?.province ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [sport, setSport] = useState(initialValues?.sport ?? "Calcio");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [role, setRole] = useState(initialValues?.role ?? "");
  const [gender, setGender] = useState(initialValues?.gender ?? "");
  const [ageBracket, setAgeBracket] = useState(initialValues?.ageBracket ?? "Indifferente");

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);

  const [openPicker, setOpenPicker] = useState<PickerKind | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const previousRegionRef = useRef<string>("__init__");
  const previousProvinceRef = useRef<string>("__init__");

  const selectedRegion = useMemo(() => regions.find((item) => item.name === region) ?? null, [regions, region]);
  const selectedProvince = useMemo(() => provinces.find((item) => item.name === province) ?? null, [province, provinces]);

  const categoriesForSport = CATEGORIES_BY_SPORT[sport] ?? [];
  const rolesForSport = SPORTS_ROLES[sport] ?? [];

  useEffect(() => {
    if (!initialValues) return;
    setTitle(initialValues.title ?? "");
    setDescription(initialValues.description ?? "");
    setCountry(initialValues.country ?? "IT");
    setRegion(initialValues.region ?? "");
    setProvince(initialValues.province ?? "");
    setCity(initialValues.city ?? "");
    setSport(initialValues.sport ?? "Calcio");
    setCategory(initialValues.category ?? "");
    setRole(initialValues.role ?? "");
    setGender(initialValues.gender ?? "");
    setAgeBracket(initialValues.ageBracket ?? "Indifferente");
  }, [
    initialValues?.ageBracket,
    initialValues?.category,
    initialValues?.city,
    initialValues?.country,
    initialValues?.description,
    initialValues?.gender,
    initialValues?.province,
    initialValues?.region,
    initialValues?.role,
    initialValues?.sport,
    initialValues?.title,
  ]);

  useEffect(() => {
    let mounted = true;
    void getRegions().then((items) => {
      if (mounted) setRegions(items);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!selectedRegion) {
      setProvinces([]);
      setCities([]);
      if (!region) {
        setProvince("");
        setCity("");
        previousRegionRef.current = "";
      }
      return;
    }

    const regionChanged = previousRegionRef.current !== "__init__" && previousRegionRef.current !== region;
    if (regionChanged) {
      setProvince("");
      setCity("");
      setCities([]);
    }

    previousRegionRef.current = region;

    void getProvinces(selectedRegion.id).then((items) => {
      if (!mounted) return;
      setProvinces(items);
      if (!items.some((item) => item.name === province)) {
        setProvince("");
        setCity("");
        setCities([]);
      }
    });

    return () => {
      mounted = false;
    };
  }, [region, selectedRegion?.id]);

  useEffect(() => {
    let mounted = true;
    if (!selectedProvince) {
      setCities([]);
      if (!province) {
        setCity("");
        previousProvinceRef.current = "";
      }
      return;
    }

    const provinceChanged = previousProvinceRef.current !== "__init__" && previousProvinceRef.current !== province;
    if (provinceChanged) {
      setCity("");
    }

    previousProvinceRef.current = province;

    void getMunicipalities(selectedProvince.id).then((items) => {
      if (!mounted) return;
      setCities(items);
      if (!items.some((item) => item.name === city)) {
        setCity("");
      }
    });
    return () => {
      mounted = false;
    };
  }, [province, selectedProvince?.id]);

  useEffect(() => {
    setRole("");
    if (category && !(CATEGORIES_BY_SPORT[sport] ?? []).includes(category)) {
      setCategory("");
    }
  }, [sport]);

  const stringOptions: StringOption[] = useMemo(() => {
    if (openPicker === "country") return COUNTRY_OPTIONS;
    if (openPicker === "sport") return SPORTS.map((value) => ({ label: value, value }));
    if (openPicker === "category") return categoriesForSport.map((value) => ({ label: value, value }));
    if (openPicker === "role") return rolesForSport.map((value) => ({ label: value, value }));
    if (openPicker === "gender") return GENDER_OPTIONS.map((option) => ({ label: option.label, value: option.value }));
    if (openPicker === "age") return AGE_OPTIONS.map((value) => ({ label: value, value }));
    if (openPicker === "region") return regions.map((item) => ({ label: item.name, value: item.name }));
    if (openPicker === "province") return provinces.map((item) => ({ label: item.name, value: item.name }));
    if (openPicker === "city") return cities.map((item) => ({ label: item.name, value: item.name }));
    return [];
  }, [categoriesForSport, cities, openPicker, provinces, regions, rolesForSport]);

  const modalTitle = useMemo(() => {
    if (!openPicker) return "Seleziona";
    const labels: Record<PickerKind, string> = {
      country: "Seleziona paese",
      region: "Seleziona regione",
      province: "Seleziona provincia",
      city: "Seleziona città",
      sport: "Seleziona sport",
      category: "Seleziona categoria",
      role: "Seleziona ruolo",
      gender: "Seleziona genere",
      age: "Seleziona età",
    };
    return labels[openPicker];
  }, [openPicker]);

  const selectValue = (value: string) => {
    if (openPicker === "country") {
      setCountry(value);
      setRegion("");
      setProvince("");
      setCity("");
    }
    if (openPicker === "region") {
      setRegion(value);
      setProvince("");
      setCity("");
    }
    if (openPicker === "province") {
      setProvince(value);
      setCity("");
    }
    if (openPicker === "city") setCity(value);
    if (openPicker === "sport") setSport(value);
    if (openPicker === "category") setCategory(value);
    if (openPicker === "role") setRole(value);
    if (openPicker === "gender") setGender(value);
    if (openPicker === "age") setAgeBracket(value);
    setOpenPicker(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setLocalError("Titolo obbligatorio");
      return;
    }
    if (!gender.trim()) {
      setLocalError("Genere obbligatorio");
      return;
    }
    if (rolesForSport.length > 0 && !role.trim()) {
      setLocalError("Ruolo obbligatorio");
      return;
    }

    setLocalError(null);
    const ageRange = rangeFromAgeBracket(ageBracket);

    await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      country: country || null,
      region: region || null,
      province: province || null,
      city: city || null,
      sport: sport || null,
      role: role || null,
      category: category || null,
      gender: gender || null,
      age_bracket: ageBracket === "Indifferente" ? null : ageBracket,
      age_min: ageRange.age_min,
      age_max: ageRange.age_max,
    });
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: Math.max(insets.bottom + 24, 42) }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>{heading}</Text>

        {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}
        {localError ? <Text style={{ color: theme.colors.danger }}>{localError}</Text> : null}

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Titolo *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Descrizione</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            editable={!submitting}
            multiline
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 88 }}
          />
        </View>

        <SelectField label="Paese" value={country} placeholder="Seleziona paese" disabled={submitting} onPress={() => setOpenPicker("country")} />
        <SelectField label="Regione" value={region} placeholder="Seleziona regione" disabled={submitting || !country} onPress={() => setOpenPicker("region")} />
        <SelectField label="Provincia" value={province} placeholder="Seleziona provincia" disabled={submitting || !region} onPress={() => setOpenPicker("province")} />
        <SelectField label="Città" value={city} placeholder="Seleziona città" disabled={submitting || !province} onPress={() => setOpenPicker("city")} />

        <SelectField label="Sport *" value={sport} placeholder="Seleziona sport" disabled={submitting} onPress={() => setOpenPicker("sport")} />
        <SelectField label="Categoria" value={category} placeholder="Seleziona categoria" disabled={submitting || !sport} onPress={() => setOpenPicker("category")} />
        <SelectField label={`Ruolo ${rolesForSport.length > 0 ? "*" : ""}`} value={role} placeholder="Seleziona ruolo" disabled={submitting || !sport} onPress={() => setOpenPicker("role")} />
        <SelectField label="Genere *" value={GENDER_OPTIONS.find((item) => item.value === gender)?.label ?? ""} placeholder="Seleziona genere" disabled={submitting} onPress={() => setOpenPicker("gender")} />
        <SelectField label="Età" value={ageBracket} placeholder="Seleziona età" disabled={submitting} onPress={() => setOpenPicker("age")} />

        <Pressable
          disabled={submitting}
          onPress={() => void handleSubmit()}
          style={{
            marginTop: 8,
            borderRadius: 10,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: 14,
            paddingVertical: 12,
            alignItems: "center",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: theme.colors.background, fontWeight: "800" }}>{submitting ? "Salvataggio in corso..." : submitLabel}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={openPicker !== null} transparent animationType="slide" onRequestClose={() => setOpenPicker(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 12, maxHeight: "75%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>{modalTitle}</Text>
              <Pressable onPress={() => setOpenPicker(null)} style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text>Chiudi</Text>
              </Pressable>
            </View>

            {stringOptions.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={stringOptions}
                keyExtractor={(item) => `${item.value}-${item.label}`}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectValue(item.value)}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text>{item.label}</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
