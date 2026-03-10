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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWebSession, useWhoami } from "../../src/lib/api";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../src/lib/geo/location";
import { createOpportunity } from "../../src/lib/opportunities/createOpportunity";
import {
  AGE_BRACKETS,
  CATEGORIES_BY_SPORT,
  COUNTRIES,
  DEFAULT_COUNTRY,
  FOOTBALL_SPORT,
  OPPORTUNITY_GENDER_LABELS,
  SPORTS,
  SPORTS_ROLES,
} from "../../src/constants/opportunities";
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

function OptionSelect({
  label,
  value,
  placeholder,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
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
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder || "Seleziona"}</Text>
      </Pressable>
    </View>
  );
}

function OptionsModal({
  visible,
  title,
  options,
  selected,
  searchable,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  searchable?: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
        <View style={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "80%", padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>{title}</Text>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral200 }}>
              <Text style={{ color: theme.colors.text }}>Chiudi</Text>
            </Pressable>
          </View>

          {searchable ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca..."
              style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }}
            />
          ) : null}

          <ScrollView contentContainerStyle={{ paddingBottom: 12, gap: 8 }} keyboardShouldPersistTaps="handled">
            {filtered.map((option) => (
              <Pressable
                key={option}
                onPress={() => onSelect(option)}
                style={{
                  borderWidth: 1,
                  borderColor: selected === option ? theme.colors.primary : theme.colors.neutral200,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                }}
              >
                <Text style={{ color: theme.colors.text }}>{option}</Text>
              </Pressable>
            ))}
            {!filtered.length ? <Text style={{ color: theme.colors.muted }}>Nessun risultato</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function CreateOpportunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [role, setRole] = useState("");
  const [category, setCategory] = useState("");
  const [requiredCategory, setRequiredCategory] = useState("");
  const [ageBracket, setAgeBracket] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [gender, setGender] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";
  const isItaly = country === "IT";
  const footballRoleRequired = sport === FOOTBALL_SPORT;

  const roleOptions = useMemo(() => [...(SPORTS_ROLES[sport] ?? [])], [sport]);
  const categoryOptions = useMemo(() => [...(CATEGORIES_BY_SPORT[sport] ?? [])], [sport]);

  useEffect(() => {
    void (async () => {
      const next = await getRegions();
      setRegions(next);
    })();
  }, []);

  useEffect(() => {
    if (!isItaly || !selectedRegionId) {
      setProvinces([]);
      return;
    }
    void (async () => {
      const next = await getProvinces(selectedRegionId);
      setProvinces(next);
    })();
  }, [isItaly, selectedRegionId]);

  useEffect(() => {
    if (!isItaly || !selectedProvinceId) {
      setMunicipalities([]);
      return;
    }
    void (async () => {
      const next = await getMunicipalities(selectedProvinceId);
      setMunicipalities(next);
    })();
  }, [isItaly, selectedProvinceId]);

  useEffect(() => {
    setRole("");
    setCategory("");
    setRequiredCategory("");
  }, [sport]);

  useEffect(() => {
    if (isItaly) return;
    setSelectedRegionId(null);
    setSelectedProvinceId(null);
    setRegions([]);
    setProvinces([]);
    setMunicipalities([]);
    void (async () => {
      const next = await getRegions();
      setRegions(next);
    })();
  }, [isItaly]);

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  const onSubmit = async () => {
    if (formDisabled) return;

    if (!title.trim()) return setSubmitError("Titolo obbligatorio");
    if (!sport) return setSubmitError("Sport obbligatorio");
    if (!gender) return setSubmitError("Gender obbligatorio");
    if (footballRoleRequired && !role) return setSubmitError("Ruolo obbligatorio per Calcio");

    if (isItaly) {
      if (!region || !province || !city) return setSubmitError("Per l'Italia seleziona Regione, Provincia e Città");
    } else {
      if (!region || !city) return setSubmitError("Fuori Italia inserisci almeno Regione e Città");
    }

    const ageMinValue = asOptionalNumber(ageMin);
    const ageMaxValue = asOptionalNumber(ageMax);

    if (ageMin.trim() && ageMinValue === null) return setSubmitError("Età minima non valida");
    if (ageMax.trim() && ageMaxValue === null) return setSubmitError("Età massima non valida");
    if (ageMinValue !== null && ageMaxValue !== null && ageMinValue > ageMaxValue) {
      return setSubmitError("Età minima non può superare età massima");
    }

    const payload: CreateOpportunityPayload = {
      title: title.trim(),
      description: asOptionalText(description),
      country: asOptionalText(country),
      region: asOptionalText(region),
      province: asOptionalText(province),
      city: asOptionalText(city),
      sport: asOptionalText(sport),
      role: footballRoleRequired ? asOptionalText(role) : null,
      category: asOptionalText(category),
      required_category: asOptionalText(requiredCategory),
      age_bracket: asOptionalText(ageBracket),
      age_min: ageMinValue,
      age_max: ageMaxValue,
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
      { text: "OK", onPress: () => router.replace("/(tabs)/opportunities") },
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
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: Math.max(42, insets.bottom + 20) }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>
        <Text style={{ color: theme.colors.muted }}>Compila i campi allineati al payload web POST /api/opportunities.</Text>

        {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Titolo *</Text>
          <TextInput value={title} onChangeText={setTitle} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.text }}>Descrizione</Text>
          <TextInput value={description} onChangeText={setDescription} editable={!formDisabled} multiline style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, minHeight: 90, textAlignVertical: "top" }} />
        </View>

        <OptionSelect label="Country" value={country} onPress={() => setPicker("country")} />

        {isItaly ? (
          <>
            <OptionSelect label="Regione" value={region} disabled={!regions.length} onPress={() => setPicker("region")} />
            <OptionSelect label="Provincia" value={province} disabled={!selectedRegionId || !provinces.length} onPress={() => setPicker("province")} />
            <OptionSelect label="Città" value={city} disabled={!selectedProvinceId || !municipalities.length} onPress={() => setPicker("city")} />
          </>
        ) : (
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
        )}

        <OptionSelect label="Sport *" value={sport} onPress={() => setPicker("sport")} />
        <OptionSelect label={`Ruolo${footballRoleRequired ? " *" : ""}`} value={role} disabled={!roleOptions.length} onPress={() => setPicker("role")} />
        <OptionSelect label="Categoria" value={category} disabled={!categoryOptions.length} onPress={() => setPicker("category")} />
        <OptionSelect label="Categoria richiesta" value={requiredCategory} disabled={!categoryOptions.length} onPress={() => setPicker("requiredCategory")} />
        <OptionSelect label="Age bracket" value={ageBracket} onPress={() => setPicker("ageBracket")} />
        <OptionSelect label="Gender *" value={gender} onPress={() => setPicker("gender")} />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Età minima</Text>
            <TextInput value={ageMin} keyboardType="numeric" onChangeText={setAgeMin} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Età massima</Text>
            <TextInput value={ageMax} keyboardType="numeric" onChangeText={setAgeMax} editable={!formDisabled} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }} />
          </View>
        </View>

        <Pressable
          disabled={formDisabled}
          onPress={() => void onSubmit()}
          style={{ marginTop: 8, borderRadius: 10, backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 12, alignItems: "center", opacity: formDisabled ? 0.6 : 1 }}
        >
          <Text style={{ color: theme.colors.background, fontWeight: "800" }}>{submitting ? "Pubblicazione in corso..." : "Pubblica opportunità"}</Text>
        </Pressable>
      </ScrollView>

      <OptionsModal
        visible={picker === "country"}
        title="Seleziona country"
        options={[...COUNTRIES]}
        selected={country}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setCountry(value);
          setRegion("");
          setProvince("");
          setCity("");
          setSelectedRegionId(null);
          setSelectedProvinceId(null);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "sport"}
        title="Seleziona sport"
        options={[...SPORTS]}
        selected={sport}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setSport(value);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "role"}
        title="Seleziona ruolo"
        options={roleOptions}
        selected={role}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setRole(value);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "category"}
        title="Seleziona categoria"
        options={categoryOptions}
        selected={category}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setCategory(value);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "requiredCategory"}
        title="Seleziona categoria richiesta"
        options={categoryOptions}
        selected={requiredCategory}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setRequiredCategory(value);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "gender"}
        title="Seleziona gender"
        options={[...OPPORTUNITY_GENDER_LABELS]}
        selected={gender}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setGender(value);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "ageBracket"}
        title="Seleziona age bracket"
        options={[...AGE_BRACKETS]}
        selected={ageBracket}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setAgeBracket(value);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "region"}
        title="Seleziona regione"
        options={regions.map((item) => item.name)}
        selected={region}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          const item = regions.find((entry) => entry.name === value);
          setSelectedRegionId(item?.id ?? null);
          setSelectedProvinceId(null);
          setRegion(value);
          setProvince("");
          setCity("");
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "province"}
        title="Seleziona provincia"
        options={provinces.map((item) => item.name)}
        selected={province}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          const item = provinces.find((entry) => entry.name === value);
          setSelectedProvinceId(item?.id ?? null);
          setProvince(value);
          setCity("");
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "city"}
        title="Seleziona città"
        options={municipalities.map((item) => item.name)}
        selected={city}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setCity(value);
          setPicker(null);
        }}
      />
    </>
  );
}
