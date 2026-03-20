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
import { useRouter } from "expo-router";
import { AvatarUploader } from "../../components/profiles/AvatarUploader";
import { LocationFields } from "../../components/profiles/LocationFields";
import { fetchProfileMe, patchProfileMe, type ProfileMe, useWebSession } from "../../src/lib/api";
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
  { label: "Italia", value: "IT" },
  { label: "Spagna", value: "ES" },
  { label: "Francia", value: "FR" },
  { label: "Germania", value: "DE" },
  { label: "Regno Unito", value: "GB" },
  { label: "Stati Uniti", value: "US" },
];

const SPORT_OPTIONS: Option[] = [
  { label: "Calcio", value: "Calcio" },
  { label: "Futsal", value: "Futsal" },
];

const FOOT_OPTIONS: Option[] = [
  { label: "Destro", value: "Destro" },
  { label: "Sinistro", value: "Sinistro" },
  { label: "Ambidestro", value: "Ambidestro" },
];

const FOOTBALL_ROLE_OPTIONS: Option[] = [
  { label: "Portiere", value: "Portiere" },
  { label: "Difensore centrale", value: "Difensore centrale" },
  { label: "Terzino destro", value: "Terzino destro" },
  { label: "Terzino sinistro", value: "Terzino sinistro" },
  { label: "Centrocampista", value: "Centrocampista" },
  { label: "Mediano", value: "Mediano" },
  { label: "Trequartista", value: "Trequartista" },
  { label: "Ala destra", value: "Ala destra" },
  { label: "Ala sinistra", value: "Ala sinistra" },
  { label: "Punta centrale", value: "Punta centrale" },
  { label: "Seconda punta", value: "Seconda punta" },
];

function asText(v: unknown) {
  return typeof v === "string" ? v : "";
}

function asNumText(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
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
  return [
    values.instagram ? { label: "Instagram", url: values.instagram.trim() } : null,
    values.facebook ? { label: "Facebook", url: values.facebook.trim() } : null,
    values.tiktok ? { label: "TikTok", url: values.tiktok.trim() } : null,
    values.x ? { label: "X (Twitter)", url: values.x.trim() } : null,
  ].filter(Boolean);
}

function parseSkills(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 10);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  return [] as string[];
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
      <Text style={{ fontWeight: "600" }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: disabled ? theme.colors.neutral100 : theme.colors.background,
        }}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder}</Text>
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: theme.colors.background, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 12, maxHeight: "70%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>{title}</Text>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral200 }}>
              <Text>Chiudi</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
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
                    borderColor: selected ? theme.colors.text : theme.colors.neutral200,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    backgroundColor: selected ? theme.colors.neutral100 : theme.colors.background,
                  }}
                >
                  <Text style={{ fontWeight: selected ? "700" : "500" }}>{option.label}</Text>
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
  const [openPicker, setOpenPicker] = useState<null | "country" | "sport" | "role" | "foot">(null);

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
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [socials, setSocials] = useState<SocialValues>({ instagram: "", facebook: "", tiktok: "", x: "" });
  const [notifyEmail, setNotifyEmail] = useState(false);
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
  const sportOptions = useMemo(() => ensureOption(SPORT_OPTIONS, sport), [sport]);
  const roleOptions = useMemo(() => ensureOption(FOOTBALL_ROLE_OPTIONS, role), [role]);
  const footOptions = useMemo(() => ensureOption(FOOT_OPTIONS, foot), [foot]);

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
    setRole(asText(data.role));
    setBio(asText(data.bio));
    setFoot(asText(data.foot));
    setHeightCm(asNumText(data.height_cm));
    setWeightKg(asNumText(data.weight_kg));
    setSkills(parseSkills(data.skills));
    setSkillInput("");
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
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!web.ready) return;
    void loadProfile();
  }, [loadProfile, web.ready]);

  const addSkill = useCallback(() => {
    const next = skillInput.trim();
    if (!next) return;
    setSkills((current) => {
      if (current.includes(next) || current.length >= 10) return current;
      return [...current, next];
    });
    setSkillInput("");
  }, [skillInput]);

  const removeSkill = useCallback((skill: string) => {
    setSkills((current) => current.filter((item) => item !== skill));
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    const response = await patchProfileMe({
      avatar_url: avatarUrl,
      full_name: fullName,
      display_name: fullName,
      birth_year: birthYear,
      country,
      sport,
      role,
      bio,
      foot,
      height_cm: heightCm,
      weight_kg: weightKg,
      skills: JSON.stringify(skills),
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
    setSaving(false);

    if (!response.ok) {
      Alert.alert("Errore", response.errorText ?? "Salvataggio fallito");
      return;
    }
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
    role,
    skills,
    socials,
    sport,
    weightKg,
  ]);

  const disabled = useMemo(() => saving || loading || !web.ready, [loading, saving, web.ready]);

  if (web.loading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 48, paddingTop: 12 }} style={{ backgroundColor: theme.colors.background }}>
        {web.error ? <Text style={{ color: theme.colors.danger }}>{web.error}</Text> : null}
        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

        <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
          <TextInput placeholder="Nome e cognome" value={fullName} onChangeText={setFullName} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6 }}>Anno di nascita</Text>
              <TextInput placeholder="1996" value={birthYear} onChangeText={setBirthYear} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <SelectField label="Nazionalità" value={getCountryLabel(country)} placeholder="Seleziona" onPress={() => setOpenPicker("country")} helperText={`${country} ${getCountryLabel(country)}`} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SelectField label="Sport" value={sport} placeholder="Seleziona sport" onPress={() => setOpenPicker("sport")} />
            <SelectField label="Ruolo" value={role} placeholder="Seleziona ruolo" onPress={() => setOpenPicker("role")} helperText="I ruoli mostrati dipendono dallo sport scelto." />
          </View>
          <TextInput placeholder="Biografia" value={bio} onChangeText={setBio} multiline style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: "top" }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SelectField label="Piede preferito" value={foot} placeholder="Seleziona piede" onPress={() => setOpenPicker("foot")} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>Altezza (cm)</Text>
              <TextInput placeholder="187" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>Peso (kg)</Text>
              <TextInput placeholder="85" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Competenze</Text>
          <Text style={{ color: theme.colors.muted }}>Aggiungi fino a 10 competenze chiave.</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              placeholder="Es. Dribbling, leadership, visione di gioco"
              value={skillInput}
              onChangeText={setSkillInput}
              editable={skills.length < 10}
              style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }}
            />
            <Pressable onPress={addSkill} disabled={skills.length >= 10 || !skillInput.trim()} style={{ backgroundColor: skills.length >= 10 || !skillInput.trim() ? theme.colors.muted : "#7c9cff", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" }}>
              <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Aggiungi</Text>
            </Pressable>
          </View>
          <Text style={{ alignSelf: "flex-end", color: theme.colors.muted }}>{skills.length}/10</Text>
          <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, padding: 12, minHeight: 56, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {skills.length ? (
              skills.map((skill) => (
                <Pressable key={skill} onPress={() => removeSkill(skill)} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text>{skill} ×</Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ color: theme.colors.muted }}>Nessuna competenza inserita.</Text>
            )}
          </View>
        </View>

        <LocationFields mode="player" title="Zona di interesse" values={interest} onChange={setInterest} />

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Profili social</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Inserisci URL completi o semplici @handle.</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>Instagram</Text>
              <TextInput placeholder="https://instagram.com/..." value={socials.instagram} onChangeText={(value) => setSocials((current) => ({ ...current, instagram: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>Facebook</Text>
              <TextInput placeholder="https://facebook.com/..." value={socials.facebook} onChangeText={(value) => setSocials((current) => ({ ...current, facebook: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>TikTok</Text>
              <TextInput placeholder="https://tiktok.com/@..." value={socials.tiktok} onChangeText={(value) => setSocials((current) => ({ ...current, tiktok: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>X (Twitter)</Text>
              <TextInput placeholder="@tuonome" value={socials.x} onChangeText={(value) => setSocials((current) => ({ ...current, x: value }))} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Notifiche</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontWeight: "600" }}>Email per nuovi messaggi</Text>
            <Switch value={notifyEmail} onValueChange={setNotifyEmail} />
          </View>
        </View>

        <Pressable disabled={disabled} onPress={() => void onSave()} style={{ backgroundColor: disabled ? theme.colors.muted : "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 16 }}>
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{saving ? "Salvo..." : "Salva profilo"}</Text>
        </Pressable>
      </ScrollView>

      <PickerModal visible={openPicker === "country"} title="Nazionalità" options={countryOptions} selectedValue={country} onClose={() => setOpenPicker(null)} onSelect={setCountry} />
      <PickerModal visible={openPicker === "sport"} title="Sport" options={sportOptions} selectedValue={sport} onClose={() => setOpenPicker(null)} onSelect={(value) => {
        setSport(value);
        if (!roleOptions.some((option) => option.value === role)) setRole("");
      }} />
      <PickerModal visible={openPicker === "role"} title="Ruolo" options={roleOptions} selectedValue={role} onClose={() => setOpenPicker(null)} onSelect={setRole} />
      <PickerModal visible={openPicker === "foot"} title="Piede preferito" options={footOptions} selectedValue={foot} onClose={() => setOpenPicker(null)} onSelect={setFoot} />
    </>
  );
}
