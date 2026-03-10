import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
  return Array.from(new Set(values.map((item) => String(item ?? "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "it", { sensitivity: "base" }),
  );
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

type SelectModalState = {
  title: string;
  options: string[];
  allowClear?: boolean;
  onSelect: (value: string) => void;
};

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
  const [selectModal, setSelectModal] = useState<SelectModalState | null>(null);
  const [selectQuery, setSelectQuery] = useState("");

  const roleValue = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
  const isClub = roleValue === "club";

  const formDisabled = useMemo(() => submitting || web.loading || whoami.loading || !isClub, [isClub, submitting, web.loading, whoami.loading]);

  const selectOptionsFiltered = useMemo(() => {
    const base = selectModal?.options ?? [];
    const query = selectQuery.trim().toLowerCase();
    if (!query) return base;
    return base.filter((item) => item.toLowerCase().includes(query));
  }, [selectModal?.options, selectQuery]);

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

  const openSelectModal = (params: SelectModalState) => {
    if (formDisabled) return;
    setSelectQuery("");
    setSelectModal(params);
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
          { label: "Country", value: country, options: ["IT"], onSelect: setCountry, allowClear: false, enabled: true },
          { label: "Regione", value: region, options: regions.map((item) => item.name), onSelect: setRegion, allowClear: true, enabled: true },
          {
            label: "Provincia",
            value: province,
            options: provinces.map((item) => item.name),
            onSelect: setProvince,
            allowClear: true,
            enabled: Boolean(region),
          },
          {
            label: "Città",
            value: city,
            options: municipalities.map((item) => item.name),
            onSelect: setCity,
            allowClear: true,
            enabled: Boolean(province),
          },
          { label: "Sport", value: sport, options: sportOptions, onSelect: setSport, allowClear: true, enabled: sportOptions.length > 0 },
          { label: "Ruolo", value: role, options: roleOptions, onSelect: setRole, allowClear: true, enabled: roleOptions.length > 0 },
          {
            label: "Categoria richiesta",
            value: requiredCategory,
            options: requiredCategoryOptions,
            onSelect: setRequiredCategory,
            allowClear: true,
            enabled: requiredCategoryOptions.length > 0,
          },
          { label: "Gender", value: gender, options: genderOptions, onSelect: setGender, allowClear: true, enabled: genderOptions.length > 0 },
          {
            label: "Status",
            value: status,
            options: statusOptions.length ? statusOptions : ["open"],
            onSelect: setStatus,
            allowClear: false,
            enabled: true,
          },
        ].map((field) => (
          <View key={field.label} style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: theme.colors.text }}>{field.label}</Text>
            <Pressable
              disabled={formDisabled || !field.enabled}
              onPress={() => openSelectModal({ title: field.label, options: field.options, onSelect: field.onSelect, allowClear: field.allowClear })}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.neutral200,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                opacity: formDisabled || !field.enabled ? 0.6 : 1,
              }}
            >
              <Text style={{ color: field.value ? theme.colors.text : theme.colors.muted }}>
                {field.value || (field.enabled ? "Seleziona" : "Nessuna opzione")}
              </Text>
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

      <Modal visible={Boolean(selectModal)} animationType="slide" transparent onRequestClose={() => setSelectModal(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "78%",
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
              <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.text }}>{selectModal?.title}</Text>
              {(selectModal?.options?.length ?? 0) > 8 ? (
                <TextInput
                  value={selectQuery}
                  onChangeText={setSelectQuery}
                  placeholder="Cerca..."
                  placeholderTextColor={theme.colors.muted}
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
            </View>

            <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
              {selectModal?.allowClear ? (
                <Pressable
                  onPress={() => {
                    selectModal.onSelect("");
                    setSelectModal(null);
                  }}
                  style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12 }}
                >
                  <Text style={{ color: theme.colors.text }}>Nessuno</Text>
                </Pressable>
              ) : null}

              {selectOptionsFiltered.length ? (
                selectOptionsFiltered.map((option) => (
                  <Pressable
                    key={`${selectModal?.title}-${option}`}
                    onPress={() => {
                      selectModal?.onSelect(option);
                      setSelectModal(null);
                    }}
                    style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12 }}
                  >
                    <Text style={{ color: theme.colors.text }}>{option}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: theme.colors.muted, paddingHorizontal: 2 }}>Nessuna opzione disponibile</Text>
              )}
            </ScrollView>

            <View style={{ paddingHorizontal: 12 }}>
              <Pressable
                onPress={() => setSelectModal(null)}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.neutral200,
                  borderRadius: 10,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Chiudi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
