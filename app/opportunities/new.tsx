import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AGE_BRACKETS,
  CATEGORIES_BY_SPORT,
  COUNTRIES,
  OPPORTUNITY_GENDER_LABELS,
  ROLE_REQUIRED_SPORTS,
  SPORTS,
  SPORTS_ROLES,
} from "../../src/constants/opportunities";
import { getMunicipalities, getProvinces, getRegions, type LocationOption } from "../../src/lib/geo/location";
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

function getAgeValues(label: string): { ageMin: number | null; ageMax: number | null } {
  return AGE_BRACKETS.find((item) => item.label === label) ?? { ageMin: null, ageMax: null };
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  disabled?: boolean;
  placeholder?: string;
  onSelect: (next: string) => void;
};

function SelectField({ label, value, options, disabled, placeholder, onSelect }: SelectFieldProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "600", color: theme.colors.text }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.select,
          { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder || "Seleziona"}</Text>
      </Pressable>

      <Modal transparent animationType="slide" visible={visible} onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) + 36 }]}> 
          <Text style={styles.sheetTitle}>{label}</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
            {options.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  onSelect(item);
                  setVisible(false);
                }}
                style={styles.sheetRow}
              >
                <Text style={{ color: theme.colors.text, fontWeight: value === item ? "700" : "500" }}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
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
  const [category, setCategory] = useState("");
  const [ageBracket, setAgeBracket] = useState("");
  const [gender, setGender] = useState("");
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";
  const roleRequired = ROLE_REQUIRED_SPORTS.has(sport);

  const formDisabled = useMemo(
    () => submitting || web.loading || whoami.loading || !isClub,
    [isClub, submitting, web.loading, whoami.loading],
  );

  useEffect(() => {
    if (country !== "IT") {
      setRegions([]);
      setProvinces([]);
      setMunicipalities([]);
      setSelectedRegionId(null);
      setSelectedProvinceId(null);
      return;
    }
    getRegions().then(setRegions).catch(() => setRegions([]));
  }, [country]);

  useEffect(() => {
    if (country !== "IT" || !selectedRegionId) {
      setProvinces([]);
      setProvince("");
      setSelectedProvinceId(null);
      return;
    }
    getProvinces(selectedRegionId).then(setProvinces).catch(() => setProvinces([]));
  }, [country, selectedRegionId]);

  useEffect(() => {
    if (country !== "IT" || !selectedProvinceId) {
      setMunicipalities([]);
      setCity("");
      return;
    }
    getMunicipalities(selectedProvinceId).then(setMunicipalities).catch(() => setMunicipalities([]));
  }, [country, selectedProvinceId]);

  const onSubmit = async () => {
    if (formDisabled) return;

    if (!title.trim()) {
      setSubmitError("Titolo obbligatorio");
      return;
    }
    if (!sport) {
      setSubmitError("Sport obbligatorio");
      return;
    }
    if (roleRequired && !role) {
      setSubmitError("Ruolo obbligatorio");
      return;
    }

    const { ageMin, ageMax } = getAgeValues(ageBracket);

    const payload: CreateOpportunityPayload = {
      title: title.trim(),
      description: asOptionalText(description),
      country: asOptionalText(country),
      region: asOptionalText(region),
      province: asOptionalText(province),
      city: asOptionalText(city),
      sport: asOptionalText(sport),
      role: asOptionalText(role),
      required_category: asOptionalText(category),
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
      </View>
    );
  }

  const roles = sport ? SPORTS_ROLES[sport] ?? [] : [];
  const categories = sport ? CATEGORIES_BY_SPORT[sport] ?? [] : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 42 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Nuova opportunità</Text>

      {submitError ? <Text style={{ color: theme.colors.danger }}>{submitError}</Text> : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Titolo *</Text>
        <TextInput value={title} onChangeText={setTitle} editable={!formDisabled} style={styles.input} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: theme.colors.text }}>Descrizione</Text>
        <TextInput value={description} onChangeText={setDescription} editable={!formDisabled} style={styles.input} multiline />
      </View>

      <SelectField
        label="Country"
        value={country}
        options={COUNTRIES}
        disabled={formDisabled}
        onSelect={(next) => {
          setCountry(next);
          setRegion("");
          setProvince("");
          setCity("");
        }}
      />

      {country === "IT" ? (
        <>
          <SelectField
            label="Regione"
            value={region}
            options={regions.map((item) => item.name)}
            disabled={formDisabled}
            onSelect={(next) => {
              setRegion(next);
              const selected = regions.find((item) => item.name === next) ?? null;
              setSelectedRegionId(selected?.id ?? null);
              setProvince("");
              setCity("");
            }}
          />
          <SelectField
            label="Provincia"
            value={province}
            options={provinces.map((item) => item.name)}
            disabled={formDisabled || !region}
            onSelect={(next) => {
              setProvince(next);
              const selected = provinces.find((item) => item.name === next) ?? null;
              setSelectedProvinceId(selected?.id ?? null);
              setCity("");
            }}
          />
          <SelectField
            label="Città"
            value={city}
            options={municipalities.map((item) => item.name)}
            disabled={formDisabled || !province}
            onSelect={setCity}
          />
        </>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Regione</Text>
            <TextInput value={region} onChangeText={setRegion} editable={!formDisabled} style={styles.input} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Provincia</Text>
            <TextInput value={province} onChangeText={setProvince} editable={!formDisabled} style={styles.input} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>Città</Text>
            <TextInput value={city} onChangeText={setCity} editable={!formDisabled} style={styles.input} />
          </View>
        </>
      )}

      <SelectField label="Sport" value={sport} options={SPORTS} disabled={formDisabled} onSelect={(next) => {
        setSport(next);
        setRole("");
        setCategory("");
      }} />

      <SelectField
        label={roleRequired ? "Ruolo *" : "Ruolo"}
        value={role}
        options={roles}
        disabled={formDisabled || !sport}
        onSelect={setRole}
      />

      <SelectField
        label="Categoria"
        value={category}
        options={categories}
        disabled={formDisabled || !sport}
        onSelect={setCategory}
      />

      <SelectField
        label="Fascia età"
        value={ageBracket}
        options={AGE_BRACKETS.map((item) => item.label)}
        disabled={formDisabled}
        onSelect={setAgeBracket}
      />

      <SelectField
        label="Gender"
        value={gender}
        options={OPPORTUNITY_GENDER_LABELS}
        disabled={formDisabled}
        onSelect={setGender}
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
        }}
      >
        <Text style={{ color: theme.colors.background, fontWeight: "800" }}>
          {submitting ? "Pubblicazione in corso..." : "Pubblica opportunità"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
  },
  select: {
    borderWidth: 1,
    borderColor: theme.colors.neutral200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  sheet: {
    maxHeight: "65%",
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: theme.colors.text,
  },
  sheetRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.neutral200,
  },
});
