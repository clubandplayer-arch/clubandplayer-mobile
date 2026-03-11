import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
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
import {
  getMunicipalities,
  getProvinces,
  getRegions,
  type LocationOption,
} from "../../src/lib/geo/location";
import { createOpportunity } from "../../src/lib/opportunities/createOpportunity";
import type { CreateOpportunityPayload } from "../../src/types/opportunity";
import { theme } from "../../src/theme";

function normalizeRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase();
}

function SelectorField({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "700", color: theme.colors.text }}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: disabled ? theme.colors.neutral100 : theme.colors.background,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder}</Text>
      </Pressable>
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

  const [activeSelector, setActiveSelector] = useState<
    "country" | "region" | "province" | "city" | "sport" | "role" | "category" | "age" | "gender" | null
  >(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";
  const isItaly = country === "IT";

  useEffect(() => {
    if (!isItaly) {
      setRegion("");
      setProvince("");
      setCity("");
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
      setProvince("");
      setCity("");
      setProvinces([]);
      setCities([]);
      return;
    }
    setProvince("");
    setCity("");
    setCities([]);
    void getProvinces(selectedRegion.id).then(setProvinces);
  }, [isItaly, region, regions]);

  useEffect(() => {
    if (!isItaly) return;
    const selectedProvince = provinces.find((item) => item.name === province);
    if (!selectedProvince) {
      setCity("");
      setCities([]);
      return;
    }
    setCity("");
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

  const selectorOptions = useMemo(() => {
    switch (activeSelector) {
      case "country":
        return COUNTRIES.map((item) => ({ label: item.label, value: item.value }));
      case "region":
        return regions.map((item) => ({ label: item.name, value: item.name }));
      case "province":
        return provinces.map((item) => ({ label: item.name, value: item.name }));
      case "city":
        return cities.map((item) => ({ label: item.name, value: item.name }));
      case "sport":
        return SPORTS.map((item) => ({ label: item, value: item }));
      case "role":
        return roles.map((item) => ({ label: item, value: item }));
      case "category":
        return categories.map((item) => ({ label: item, value: item }));
      case "age":
        return AGE_BRACKETS.map((item) => ({ label: item, value: item }));
      case "gender":
        return GENDERS.map((item) => ({ label: item.label, value: item.value }));
      default:
        return [];
    }
  }, [activeSelector, regions, provinces, cities, roles, categories]);

  const onSelectValue = (value: string) => {
    switch (activeSelector) {
      case "country":
        setCountry(value);
        break;
      case "region":
        setRegion(value);
        break;
      case "province":
        setProvince(value);
        break;
      case "city":
        setCity(value);
        break;
      case "sport":
        setSport(value);
        break;
      case "role":
        setRole(value);
        break;
      case "category":
        setCategory(value);
        break;
      case "age":
        setAgeBracket(value as (typeof AGE_BRACKETS)[number]);
        break;
      case "gender":
        setGender(value);
        break;
      default:
        break;
    }
    setActiveSelector(null);
  };

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
      category: category || null,
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
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
          Accesso riservato ai club
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Opportunità" }} />
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: insets.bottom + 180,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>
        {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

        <TextInput
          value={title}
          onChangeText={setTitle}
          editable={!formDisabled}
          placeholder="Titolo *"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!formDisabled}
          placeholder="Descrizione"
          multiline
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            minHeight: 90,
            textAlignVertical: "top",
          }}
        />

        <SelectorField
          label="Paese"
          value={COUNTRIES.find((item) => item.value === country)?.label ?? ""}
          placeholder="Seleziona paese"
          disabled={formDisabled}
          onPress={() => setActiveSelector("country")}
        />

        {isItaly ? (
          <>
            <SelectorField
              label="Regione"
              value={region}
              placeholder="Seleziona regione"
              disabled={formDisabled || regions.length === 0}
              onPress={() => setActiveSelector("region")}
            />
            <SelectorField
              label="Provincia"
              value={province}
              placeholder="Seleziona provincia"
              disabled={formDisabled || !region || provinces.length === 0}
              onPress={() => setActiveSelector("province")}
            />
            <SelectorField
              label="Città"
              value={city}
              placeholder="Seleziona città"
              disabled={formDisabled || !province || cities.length === 0}
              onPress={() => setActiveSelector("city")}
            />
          </>
        ) : (
          <>
            <TextInput
              value={region}
              onChangeText={setRegion}
              editable={!formDisabled}
              placeholder="Regione"
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
            <TextInput
              value={province}
              onChangeText={setProvince}
              editable={!formDisabled}
              placeholder="Provincia"
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
            <TextInput
              value={city}
              onChangeText={setCity}
              editable={!formDisabled}
              placeholder="Città"
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
          </>
        )}

        <SelectorField
          label="Sport"
          value={sport}
          placeholder="Seleziona sport"
          disabled={formDisabled}
          onPress={() => setActiveSelector("sport")}
        />

        <SelectorField
          label="Ruolo"
          value={role}
          placeholder={sport ? "Seleziona ruolo" : "Seleziona prima lo sport"}
          disabled={formDisabled || !sport || roles.length === 0}
          onPress={() => setActiveSelector("role")}
        />

        <SelectorField
          label="Categoria"
          value={category}
          placeholder={sport ? "Seleziona categoria" : "Seleziona prima lo sport"}
          disabled={formDisabled || !sport || categories.length === 0}
          onPress={() => setActiveSelector("category")}
        />

        <SelectorField
          label="Fascia età"
          value={ageBracket}
          placeholder="Seleziona fascia età"
          disabled={formDisabled}
          onPress={() => setActiveSelector("age")}
        />

        <SelectorField
          label="Gender *"
          value={GENDERS.find((item) => item.value === gender)?.label ?? ""}
          placeholder="Seleziona gender"
          disabled={formDisabled}
          onPress={() => setActiveSelector("gender")}
        />

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
            marginBottom: insets.bottom + 24,
          }}
        >
          <Text style={{ color: theme.colors.background, fontWeight: "800" }}>
            {submitting ? "Pubblicazione in corso..." : "Pubblica opportunità"}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={activeSelector !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSelector(null)}
      >
        <Pressable
          onPress={() => setActiveSelector(null)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              maxHeight: "70%",
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 8,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 36,
              gap: 8,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 40,
                height: 4,
                borderRadius: 99,
                backgroundColor: theme.colors.neutral200,
                marginBottom: 6,
              }}
            />
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {selectorOptions.map((option) => (
                <Pressable
                  key={`${activeSelector}-${option.value}`}
                  onPress={() => onSelectValue(option.value)}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neutral200,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: theme.colors.text }}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
