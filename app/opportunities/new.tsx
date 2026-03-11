import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWebSession, useWhoami } from "../../src/lib/api";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../src/lib/geo/location";
import { createOpportunity } from "../../src/lib/opportunities/createOpportunity";
import {
  AGE_BRACKETS,
  CATEGORIES_BY_SPORT,
  COUNTRIES,
  FOOTBALL_SPORT,
  ITALY_LABEL,
  OPPORTUNITY_GENDER_OPTIONS,
  OTHER_COUNTRY_LABEL,
  SPORTS,
  SPORTS_ROLES,
  ageBracketToRange,
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

function OptionSelect({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
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
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || "Seleziona"}</Text>
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
        <View
          style={{
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: "80%",
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>{title}</Text>
            <Pressable
              onPress={onClose}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
              }}
            >
              <Text style={{ color: theme.colors.text }}>Chiudi</Text>
            </Pressable>
          </View>

          {searchable ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cerca..."
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.colors.text,
              }}
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
  const [country, setCountry] = useState(ITALY_LABEL);
  const [countryOther, setCountryOther] = useState("");
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
  const [picker, setPicker] = useState<string | null>(null);

  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";

  const isItaly = country === ITALY_LABEL;
  const isOtherCountry = country === OTHER_COUNTRY_LABEL;
  const footballRoleRequired = sport === FOOTBALL_SPORT;

  const roleOptions = useMemo(() => [...(SPORTS_ROLES[sport] ?? [])], [sport]);
  const categoryOptions = useMemo(() => [...(CATEGORIES_BY_SPORT[sport] ?? [])], [sport]);
  const selectedGenderLabel = useMemo(
    () => OPPORTUNITY_GENDER_OPTIONS.find((item) => item.value === gender)?.label ?? "",
    [gender],
  );

  useEffect(() => {
    void (async () => {
      setRegions(await getRegions());
    })();
  }, []);

  useEffect(() => {
    if (!isItaly || !selectedRegionId) {
      setProvinces([]);
      return;
    }
    void (async () => {
      setProvinces(await getProvinces(selectedRegionId));
    })();
  }, [isItaly, selectedRegionId]);

  useEffect(() => {
    if (!isItaly || !selectedProvinceId) {
      setMunicipalities([]);
      return;
    }
    void (async () => {
      setMunicipalities(await getMunicipalities(selectedProvinceId));
    })();
  }, [isItaly, selectedProvinceId]);

  useEffect(() => {
    setRole("");
    setCategory("");
  }, [sport]);

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

    if (isItaly && (!region || !province || !city)) {
      return setSubmitError("Per Italia seleziona Regione, Provincia e Città");
    }
    if (!isItaly && (!region || !city)) {
      return setSubmitError("Per estero inserisci Regione e Città");
    }
    if (isOtherCountry && !countryOther.trim()) {
      return setSubmitError("Inserisci il paese");
    }

    const normalizedAgeBracket = ageBracket === "Indifferente" ? null : asOptionalText(ageBracket);
    const ageRange = ageBracketToRange(ageBracket);

    const payload: CreateOpportunityPayload = {
      title: title.trim(),
      description: asOptionalText(description),
      country: isOtherCountry ? asOptionalText(countryOther) : asOptionalText(country),
      region: asOptionalText(region),
      province: isItaly ? asOptionalText(province) : null,
      city: asOptionalText(city),
      sport: asOptionalText(sport),
      role: footballRoleRequired ? asOptionalText(role) : null,
      category: asOptionalText(category),
      age_bracket: normalizedAgeBracket,
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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: Math.max(220, insets.bottom + 140) }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>

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
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, minHeight: 90, textAlignVertical: "top" }}
          />
        </View>

        <OptionSelect label="Paese" value={country} onPress={() => setPicker("country")} />

        {isOtherCountry ? (
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Paese (testo libero)</Text>
            <TextInput
              value={countryOther}
              onChangeText={setCountryOther}
              editable={!formDisabled}
              style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }}
            />
          </View>
        ) : null}

        {isItaly ? (
          <>
            <OptionSelect label="Regione" value={region} onPress={() => setPicker("region")} disabled={!regions.length} />
            <OptionSelect
              label="Provincia"
              value={province}
              onPress={() => setPicker("province")}
              disabled={!selectedRegionId || !provinces.length}
            />
            <OptionSelect
              label="Città"
              value={city}
              onPress={() => setPicker("city")}
              disabled={!selectedProvinceId || !municipalities.length}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.text }}>Regione</Text>
              <TextInput
                value={region}
                onChangeText={setRegion}
                editable={!formDisabled}
                style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.text }}>Città</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                editable={!formDisabled}
                style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text }}
              />
            </View>
          </>
        )}

        <OptionSelect label="Sport *" value={sport} onPress={() => setPicker("sport")} />
        <OptionSelect
          label={`Ruolo${footballRoleRequired ? " *" : ""}`}
          value={role}
          onPress={() => setPicker("role")}
          disabled={!roleOptions.length}
        />
        <OptionSelect
          label="Categoria"
          value={category}
          onPress={() => setPicker("category")}
          disabled={!categoryOptions.length}
        />
        <OptionSelect label="Fascia età" value={ageBracket} onPress={() => setPicker("ageBracket")} />
        <OptionSelect label="Gender *" value={selectedGenderLabel} onPress={() => setPicker("gender")} />

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

      <OptionsModal
        visible={picker === "country"}
        title="Seleziona paese"
        options={[...COUNTRIES]}
        selected={country}
        searchable
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setCountry(value);
          setCountryOther("");
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
        visible={picker === "ageBracket"}
        title="Seleziona fascia età"
        options={[...AGE_BRACKETS]}
        selected={ageBracket}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setAgeBracket(value);
          setPicker(null);
        }}
      />

      <OptionsModal
        visible={picker === "gender"}
        title="Seleziona gender"
        options={OPPORTUNITY_GENDER_OPTIONS.map((item) => item.label)}
        selected={selectedGenderLabel}
        onClose={() => setPicker(null)}
        onSelect={(label) => {
          const selected = OPPORTUNITY_GENDER_OPTIONS.find((item) => item.label === label);
          setGender(selected?.value ?? "");
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
