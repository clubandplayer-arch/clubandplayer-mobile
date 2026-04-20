import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarUploader } from "../../components/profiles/AvatarUploader";
import { LocationFields } from "../../components/profiles/LocationFields";
import {
  fetchProfileMe,
  fetchProfileMeExperiences,
  patchProfileMe,
  patchProfileMeExperiences,
  type PastExperience,
  type ProfileMe,
  useWebSession,
} from "../../src/lib/api";
import { SPORTS_ROLES } from "../../src/lib/opportunities/formOptions";
import {
  buildSeasonOptions,
  ensureCompatibleCategory,
  getCategoryOptionsForSport,
  getSportsOptions,
  isExperienceEmpty,
  isExperiencePartial,
  isValidSeason,
  normalizeExperience,
  sortExperiencesBySeasonDesc,
} from "../../src/lib/profiles/pastExperiences";
import { theme } from "../../src/theme";

type Option = {
  label: string;
  value: string;
};

type SocialValues = {
  instagram: string;
  facebook: string;
  tiktok: string;
  x: string;
};

const COUNTRY_OPTIONS: Option[] = [
  { label: "Italia (IT)", value: "IT" },
];

const FOOT_OPTIONS: Option[] = [
  { label: "Destro", value: "Destro" },
  { label: "Sinistro", value: "Sinistro" },
  { label: "Ambidestro", value: "Ambidestro" },
];

const BIO_MAX_LENGTH = 300;

function asText(v: unknown) {
  return typeof v === "string" ? v : "";
}

function asNumText(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function normalizeProfileRole(value: unknown) {
  const nextRole = asText(value).trim();
  if (!nextRole) return "";
  const normalized = nextRole.toLowerCase();
  if (normalized === "athlete" || normalized === "club" || normalized === "fan") return "";
  return nextRole;
}

function ensureOption(options: Option[], value: string, fallbackLabel?: string) {
  const normalized = value.trim();
  if (!normalized) return options;
  if (options.some((option) => option.value === normalized)) return options;
  return [{ label: fallbackLabel ?? normalized, value: normalized }, ...options];
}

function getCountryLabel(value: string) {
  return COUNTRY_OPTIONS.find((option) => option.value === value)?.label ?? (value || "Seleziona");
}

function extractSocialValues(value: unknown): SocialValues {
  const next: SocialValues = {
    instagram: "",
    facebook: "",
    tiktok: "",
    x: "",
  };

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    next.instagram = typeof record.instagram === "string" ? record.instagram.trim() : "";
    next.facebook = typeof record.facebook === "string" ? record.facebook.trim() : "";
    next.tiktok = typeof record.tiktok === "string" ? record.tiktok.trim() : "";
    next.x = typeof record.x === "string" ? record.x.trim() : "";
    return next;
  }

  if (!Array.isArray(value)) return next;

  for (const item of value) {
    let label = "";
    let url = "";

    if (typeof item === "string") {
      url = item.trim();
    } else if (item && typeof item === "object") {
      const record = item as { label?: unknown; url?: unknown };
      label = typeof record.label === "string" ? record.label.trim().toLowerCase() : "";
      url = typeof record.url === "string" ? record.url.trim() : "";
    }

    const normalized = `${label} ${url}`.toLowerCase();
    if (!url) continue;
    if (!next.instagram && (normalized.includes("instagram") || normalized.includes("instagr.am"))) next.instagram = url;
    else if (!next.facebook && normalized.includes("facebook")) next.facebook = url;
    else if (!next.tiktok && normalized.includes("tiktok")) next.tiktok = url;
    else if (!next.x && (normalized.includes("twitter") || normalized.includes("x.com"))) next.x = url;
  }

  return next;
}

function buildSocialLinks(values: SocialValues) {
  return {
    instagram: values.instagram.trim(),
    facebook: values.facebook.trim(),
    tiktok: values.tiktok.trim(),
    x: values.x.trim(),
  };
}

function SelectField({
  label,
  value,
  placeholder,
  disabled,
  onPress,
  helperText,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
  helperText?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontWeight: "600", color: theme.colors.primary }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.primarySoft,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: disabled ? theme.colors.neutral100 : theme.colors.background,
        }}
      >
        <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: value ? theme.colors.text : theme.colors.muted, fontSize: 13 }}>{value || placeholder}</Text>
      </Pressable>
      {helperText ? <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{helperText}</Text> : null}
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selectedValue,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end", paddingBottom: Math.max(insets.bottom, 12) }}>
        <View style={{ backgroundColor: theme.colors.background, padding: 16, paddingBottom: Math.max(insets.bottom, 12), borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 12, maxHeight: "70%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>{title}</Text>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primarySoft }}>
              <Text style={{ color: theme.colors.primary }}>Chiudi</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            {options.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <Pressable
                  key={`${title}-${option.value}`}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? theme.colors.primary : theme.colors.primarySoft,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    backgroundColor: selected ? theme.colors.neutral100 : theme.colors.background,
                  }}
                >
                  <Text style={{ fontWeight: selected ? "700" : "500", color: theme.colors.text }}>{option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const web = useWebSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<null | "country" | "interest_country" | "sport" | "role" | "foot">(null);
  const [experiencePicker, setExperiencePicker] = useState<null | { index: number; type: "season" | "sport" | "category" }>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [country, setCountry] = useState("IT");
  const [sport, setSport] = useState("Calcio");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [foot, setFoot] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [socials, setSocials] = useState<SocialValues>({ instagram: "", facebook: "", tiktok: "", x: "" });
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [pastExperiences, setPastExperiences] = useState<PastExperience[]>([{ season: "", club: "", sport: "", category: "" }]);
  const [interestCountry, setInterestCountry] = useState("IT");
  const [interest, setInterest] = useState({
    region_id: null as number | null,
    province_id: null as number | null,
    municipality_id: null as number | null,
    region_label: null as string | null,
    province_label: null as string | null,
    city_label: null as string | null,
  });

  const countryOptions = useMemo(() => ensureOption(COUNTRY_OPTIONS, country, getCountryLabel(country)), [country]);
  const sportChoices = useMemo(() => getSportsOptions(), []);
  const seasonOptions = useMemo(() => buildSeasonOptions().map((value) => ({ label: value, value })), []);
  const sportOptions = useMemo(() => ensureOption(sportChoices.map((value) => ({ label: value, value })), sport), [sport, sportChoices]);
  const roleOptions = useMemo(() => ensureOption((SPORTS_ROLES[sport] ?? []).map((value) => ({ label: value, value })), role), [role, sport]);
  const footOptions = useMemo(() => ensureOption(FOOT_OPTIONS, foot), [foot]);
  const biographyRemaining = BIO_MAX_LENGTH - bio.length;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchProfileMe();
    if (!response.ok) {
      setError(response.errorText ?? "Errore caricamento profilo");
      setLoading(false);
      return;
    }

    const data = (response.data ?? {}) as ProfileMe;
    const accountType = typeof data.account_type === "string" ? data.account_type : null;

    if (accountType === "club") {
      router.replace("/club/profile");
      return;
    }

    setAvatarUrl(data.avatar_url ?? null);
    setFullName(asText(data.full_name || data.display_name));
    setBirthYear(asNumText(data.birth_year));
    setCountry(asText(data.country) || "IT");
    setSport(asText(data.sport) || "Calcio");
    setRole(normalizeProfileRole(data.role));
    setBio(asText(data.bio));
    setFoot(asText(data.foot));
    setHeightCm(asNumText(data.height_cm));
    setWeightKg(asNumText(data.weight_kg));
    setSocials(extractSocialValues(data.links));
    setNotifyEmail(Boolean(data.notify_email_new_message));
    setInterestCountry(asText(data.interest_country || "IT") || "IT");
    setInterest({
      region_id: data.interest_region_id ?? null,
      province_id: data.interest_province_id ?? null,
      municipality_id: data.interest_municipality_id ?? null,
      region_label: data.interest_region ?? null,
      province_label: data.interest_province ?? null,
      city_label: data.interest_city ?? null,
    });

    if (accountType === "athlete") {
      const experiencesResponse = await fetchProfileMeExperiences();
      if (experiencesResponse.ok) {
        const items = Array.isArray(experiencesResponse.data?.experiences) ? experiencesResponse.data.experiences : [];
        const normalized = sortExperiencesBySeasonDesc(items.map((item) => normalizeExperience(item)));
        setPastExperiences(normalized.length > 0 ? normalized : [{ season: "", club: "", sport: "", category: "" }]);
      } else {
        setPastExperiences([{ season: "", club: "", sport: "", category: "" }]);
      }
    } else {
      setPastExperiences([{ season: "", club: "", sport: "", category: "" }]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!web.ready) return;
    void loadProfile();
  }, [loadProfile, web.ready]);

  const onSave = useCallback(async () => {
    const normalizedExperiences = pastExperiences.map((item) => normalizeExperience(item));
    const nonEmptyRows = normalizedExperiences.filter((item) => !isExperienceEmpty(item));
    const hasPartialRows = normalizedExperiences.some((item) => isExperiencePartial(item));
    if (hasPartialRows) {
      Alert.alert("Esperienze passate", "Compila tutti i campi della riga oppure rimuovila.");
      return;
    }
    const invalidSeason = nonEmptyRows.find((item) => !isValidSeason(item.season));
    if (invalidSeason) {
      Alert.alert("Esperienze passate", "Stagione non valida. Usa il formato YYYY/YY.");
      return;
    }

    setSaving(true);
    const response = await patchProfileMe({
      avatar_url: avatarUrl,
      full_name: fullName,
      display_name: fullName,
      birth_year: birthYear,
      country,
      sport,
      role,
      bio: bio.slice(0, BIO_MAX_LENGTH),
      foot,
      height_cm: heightCm,
      weight_kg: weightKg,
      links: JSON.stringify(buildSocialLinks(socials)),
      notify_email_new_message: notifyEmail,
      interest_country: interestCountry,
      interest_region_id: interest.region_id,
      interest_province_id: interest.province_id,
      interest_municipality_id: interest.municipality_id,
      interest_region: interest.region_label,
      interest_province: interest.province_label,
      interest_city: interest.city_label,
    });
    if (!response.ok) {
      setSaving(false);
      Alert.alert("Errore", response.errorText ?? "Salvataggio fallito");
      return;
    }

    const accountType = typeof response.data?.account_type === "string" ? response.data.account_type : "athlete";
    if (accountType === "athlete") {
      const experiencesResponse = await patchProfileMeExperiences(nonEmptyRows);
      if (!experiencesResponse.ok) {
        setSaving(false);
        Alert.alert("Errore", experiencesResponse.errorText ?? "Salvataggio esperienze fallito");
        return;
      }
    }

    setSaving(false);
    Alert.alert("Salvato", "Profilo aggiornato");
    await loadProfile();
  }, [
    avatarUrl,
    bio,
    birthYear,
    country,
    foot,
    fullName,
    heightCm,
    interest.city_label,
    interest.municipality_id,
    interest.province_id,
    interest.province_label,
    interest.region_id,
    interest.region_label,
    interestCountry,
    loadProfile,
    notifyEmail,
    pastExperiences,
    role,
    socials,
    sport,
    weightKg,
  ]);

  const updateExperience = useCallback((index: number, patch: Partial<PastExperience>) => {
    setPastExperiences((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = normalizeExperience({ ...item, ...patch });
        if (Object.prototype.hasOwnProperty.call(patch, "sport")) {
          next.category = ensureCompatibleCategory(next.sport, next.category);
        }
        return next;
      }),
    );
  }, []);

  const addExperience = useCallback(() => {
    setPastExperiences((current) => [...current, { season: "", club: "", sport: "", category: "" }]);
  }, []);

  const removeExperience = useCallback((index: number) => {
    setPastExperiences((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length > 0 ? next : [{ season: "", club: "", sport: "", category: "" }];
    });
  }, []);

  const disabled = useMemo(() => saving || loading || !web.ready, [loading, saving, web.ready]);

  const canGoBack = router.canGoBack();

  const handleHeaderBack = useCallback(() => {
    if (canGoBack) {
      router.back();
      return;
    }
    router.replace("/(tabs)/feed");
  }, [canGoBack, router]);

  if (web.loading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Profilo",
          headerLeft: canGoBack
            ? undefined
            : () => (
                <Pressable onPress={handleHeaderBack} hitSlop={12} style={{ marginLeft: 2, paddingHorizontal: 2, paddingVertical: 2 }}>
                  <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
                </Pressable>
              ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 48, paddingTop: 12 }} style={{ backgroundColor: theme.colors.background }}>
        {web.error ? <Text style={{ color: theme.colors.danger }}>{web.error}</Text> : null}
        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

        <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />

        <View style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 12, padding: 16, gap: 8 }}>
          <TextInput placeholder="Nome e cognome" value={fullName} onChangeText={setFullName} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6, color: theme.colors.primary }}>Anno di nascita</Text>
              <TextInput placeholder="1996" value={birthYear} onChangeText={setBirthYear} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <SelectField label="Nazionalità" value={getCountryLabel(country)} placeholder="Seleziona" onPress={() => setOpenPicker("country")} helperText={`${country} ${getCountryLabel(country)}`} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SelectField label="Sport" value={sport} placeholder="Seleziona sport" onPress={() => setOpenPicker("sport")} />
            <SelectField label="Ruolo" value={role} placeholder="Seleziona ruolo" onPress={() => setOpenPicker("role")} helperText="I ruoli mostrati dipendono dallo sport scelto." />
          </View>
          <TextInput
            placeholder="Biografia"
            value={bio}
            onChangeText={(value) => setBio(value.slice(0, BIO_MAX_LENGTH))}
            maxLength={BIO_MAX_LENGTH}
            multiline
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: "top" }}
          />
          <Text style={{ color: biographyRemaining <= 20 ? theme.colors.danger : theme.colors.muted, fontSize: 12, alignSelf: "flex-end" }}>
            {biographyRemaining} caratteri rimanenti
          </Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View style={{ flex: 1.15 }}>
              <SelectField label="Mano/Piede preferito" value={foot} placeholder="Seleziona piede" onPress={() => setOpenPicker("foot")} />
            </View>
            <View style={{ flex: 0.85, gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Altezza (cm)</Text>
              <TextInput placeholder="187" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <View style={{ flex: 0.85, gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Peso (kg)</Text>
              <TextInput placeholder="85" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 12, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>Zona di interesse</Text>
          <SelectField label="Paese" value={getCountryLabel(interestCountry)} placeholder="Seleziona paese" onPress={() => setOpenPicker("interest_country")} helperText={`${interestCountry} ${getCountryLabel(interestCountry)}`} />
          <LocationFields mode="player" title="Località" values={interest} onChange={setInterest} />
        </View>

        <View style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>Profili social</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Inserisci URL completi o semplici @handle.</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Instagram</Text>
              <TextInput placeholder="https://instagram.com/..." value={socials.instagram} onChangeText={(value) => setSocials((current) => ({ ...current, instagram: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Facebook</Text>
              <TextInput placeholder="https://facebook.com/..." value={socials.facebook} onChangeText={(value) => setSocials((current) => ({ ...current, facebook: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.primary }}>TikTok</Text>
              <TextInput placeholder="https://tiktok.com/@..." value={socials.tiktok} onChangeText={(value) => setSocials((current) => ({ ...current, tiktok: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600", color: theme.colors.primary }}>X (Twitter)</Text>
              <TextInput placeholder="@tuonome" value={socials.x} onChangeText={(value) => setSocials((current) => ({ ...current, x: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>Notifiche</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Email per nuovi messaggi</Text>
            <Switch value={notifyEmail} onValueChange={setNotifyEmail} />
          </View>
        </View>

        <View style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 12, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>Esperienze passate</Text>
          {pastExperiences.map((item, index) => {
            const categoryOptions = ensureOption(
              getCategoryOptionsForSport(item.sport).map((value) => ({ label: value, value })),
              item.category,
            );
            const experienceSportOptions = ensureOption(
              sportChoices.map((value) => ({ label: value, value })),
              item.sport,
            );
            return (
              <View key={`exp-${index}`} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 10, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "700", color: theme.colors.primary }}>Esperienza {index + 1}</Text>
                  <Pressable onPress={() => removeExperience(index)} disabled={pastExperiences.length <= 1}>
                    <Text style={{ color: pastExperiences.length <= 1 ? theme.colors.muted : theme.colors.danger, fontWeight: "600" }}>Rimuovi</Text>
                  </Pressable>
                </View>
                <SelectField
                  label="Stagione"
                  value={item.season}
                  placeholder="Seleziona stagione"
                  onPress={() => setExperiencePicker({ index, type: "season" })}
                />
                <View style={{ gap: 6 }}>
                  <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Club</Text>
                  <TextInput
                    placeholder="Nome club"
                    value={item.club}
                    onChangeText={(value) => updateExperience(index, { club: value })}
                    style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }}
                  />
                </View>
                <SelectField
                  label="Sport"
                  value={item.sport}
                  placeholder="Seleziona sport"
                  onPress={() => setExperiencePicker({ index, type: "sport" })}
                />
                <SelectField
                  label="Categoria"
                  value={item.category}
                  placeholder="Seleziona categoria"
                  onPress={() => setExperiencePicker({ index, type: "category" })}
                  disabled={!item.sport}
                  helperText={item.sport ? undefined : "Seleziona prima lo sport"}
                />
                {experiencePicker?.index === index && experiencePicker.type === "sport" ? (
                  <PickerModal
                    visible
                    title="Sport esperienza"
                    options={experienceSportOptions}
                    selectedValue={item.sport}
                    onClose={() => setExperiencePicker(null)}
                    onSelect={(value) => updateExperience(index, { sport: value })}
                  />
                ) : null}
                {experiencePicker?.index === index && experiencePicker.type === "season" ? (
                  <PickerModal
                    visible
                    title="Stagione"
                    options={seasonOptions}
                    selectedValue={item.season}
                    onClose={() => setExperiencePicker(null)}
                    onSelect={(value) => updateExperience(index, { season: value })}
                  />
                ) : null}
                {experiencePicker?.index === index && experiencePicker.type === "category" ? (
                  <PickerModal
                    visible
                    title="Categoria"
                    options={categoryOptions}
                    selectedValue={item.category}
                    onClose={() => setExperiencePicker(null)}
                    onSelect={(value) => updateExperience(index, { category: value })}
                  />
                ) : null}
              </View>
            );
          })}
          <Pressable
            onPress={addExperience}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.primarySoft,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>+ aggiungi esperienza</Text>
          </Pressable>
        </View>

        <Pressable disabled={disabled} onPress={() => void onSave()} style={{ backgroundColor: disabled ? theme.colors.muted : "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 16 }}>
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{saving ? "Salvo..." : "Salva profilo"}</Text>
        </Pressable>
      </ScrollView>

      <PickerModal visible={openPicker === "country"} title="Nazionalità" options={countryOptions} selectedValue={country} onClose={() => setOpenPicker(null)} onSelect={setCountry} />
      <PickerModal visible={openPicker === "interest_country"} title="Paese zona di interesse" options={countryOptions} selectedValue={interestCountry} onClose={() => setOpenPicker(null)} onSelect={setInterestCountry} />
      <PickerModal visible={openPicker === "sport"} title="Sport" options={sportOptions} selectedValue={sport} onClose={() => setOpenPicker(null)} onSelect={(value) => {
        setSport(value);
        if (!roleOptions.some((option) => option.value === role)) setRole("");
      }} />
      <PickerModal visible={openPicker === "role"} title="Ruolo" options={roleOptions} selectedValue={role} onClose={() => setOpenPicker(null)} onSelect={setRole} />
      <PickerModal visible={openPicker === "foot"} title="Mano/Piede preferito" options={footOptions} selectedValue={foot} onClose={() => setOpenPicker(null)} onSelect={setFoot} />
    </>
  );
}
