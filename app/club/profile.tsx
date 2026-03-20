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
import { CATEGORIES_BY_SPORT, SPORTS } from "../../src/lib/opportunities/formOptions";
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
  const next: SocialValues = { instagram: "", facebook: "", tiktok: "", x: "" };

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
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
      <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 }}>
        <Text style={{ color: value ? theme.colors.text : theme.colors.muted }}>{value || placeholder}</Text>
      </Pressable>
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
                  style={{ borderWidth: 1, borderColor: selected ? theme.colors.text : theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: selected ? theme.colors.neutral100 : theme.colors.background }}
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

export default function ClubProfileScreen() {
  const router = useRouter();
  const web = useWebSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<null | "country" | "sport" | "category">(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("IT");
  const [sport, setSport] = useState("Calcio");
  const [clubMotto, setClubMotto] = useState("");
  const [clubLeagueCategory, setClubLeagueCategory] = useState("");
  const [clubFoundationYear, setClubFoundationYear] = useState("");
  const [clubStadium, setClubStadium] = useState("");
  const [clubStadiumAddress, setClubStadiumAddress] = useState("");
  const [bio, setBio] = useState("");
  const [socials, setSocials] = useState<SocialValues>({ instagram: "", facebook: "", tiktok: "", x: "" });
  const [notifyEmail, setNotifyEmail] = useState(false);

  const [residence, setResidence] = useState({
    region_id: null as number | null,
    province_id: null as number | null,
    municipality_id: null as number | null,
    region_label: null as string | null,
    province_label: null as string | null,
    city_label: null as string | null,
  });

  const countryOptions = useMemo(() => ensureOption(COUNTRY_OPTIONS, country, getCountryLabel(country)), [country]);
  const sportOptions = useMemo(() => ensureOption(SPORTS.map((value) => ({ label: value, value })), sport), [sport]);
  const categoryOptions = useMemo(() => ensureOption((CATEGORIES_BY_SPORT[sport] ?? []).map((value) => ({ label: value, value })), clubLeagueCategory), [clubLeagueCategory, sport]);

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

    if (accountType === "athlete") {
      router.replace("/player/profile");
      return;
    }

    setAvatarUrl(data.avatar_url ?? null);
    setFullName(asText(data.full_name || data.display_name));
    setCountry(asText(data.country) || "IT");
    setSport(asText(data.sport) || "Calcio");
    setClubMotto(asText(data.club_motto));
    setClubLeagueCategory(asText(data.club_league_category));
    setClubFoundationYear(asNumText(data.club_foundation_year));
    setClubStadium(asText(data.club_stadium));
    setClubStadiumAddress(asText(data.club_stadium_address));
    setBio(asText(data.bio));
    setSocials(extractSocialValues(data.links));
    setNotifyEmail(Boolean(data.notify_email_new_message));

    setResidence({
      region_id: data.residence_region_id ?? null,
      province_id: data.residence_province_id ?? null,
      municipality_id: data.residence_municipality_id ?? null,
      region_label: data.region ?? null,
      province_label: data.province ?? null,
      city_label: data.city ?? null,
    });

    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!web.ready) return;
    void loadProfile();
  }, [loadProfile, web.ready]);

  const onSave = useCallback(async () => {
    setSaving(true);
    const response = await patchProfileMe({
      avatar_url: avatarUrl,
      full_name: fullName,
      display_name: fullName,
      country,
      region: residence.region_label,
      province: residence.province_label,
      city: residence.city_label,
      residence_region_id: residence.region_id,
      residence_province_id: residence.province_id,
      residence_municipality_id: residence.municipality_id,
      club_motto: clubMotto,
      sport,
      club_league_category: clubLeagueCategory,
      club_foundation_year: clubFoundationYear,
      club_stadium: clubStadium,
      club_stadium_address: clubStadiumAddress,
      bio,
      links: JSON.stringify(buildSocialLinks(socials)),
      notify_email_new_message: notifyEmail,
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
    clubFoundationYear,
    clubLeagueCategory,
    clubMotto,
    clubStadium,
    clubStadiumAddress,
    country,
    fullName,
    loadProfile,
    notifyEmail,
    residence.city_label,
    residence.municipality_id,
    residence.province_id,
    residence.province_label,
    residence.region_id,
    residence.region_label,
    socials,
    sport,
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
          <TextInput placeholder="Nome del club" value={fullName} onChangeText={setFullName} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SelectField label="Nazione del club" value={getCountryLabel(country)} placeholder="Seleziona nazione" onPress={() => setOpenPicker("country")} />
          </View>
          <LocationFields mode="club" title="Sede club" values={residence} onChange={setResidence} />
          <TextInput placeholder="Motto del club" value={clubMotto} onChangeText={setClubMotto} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <SelectField label="Sport del club" value={sport} placeholder="Seleziona sport" onPress={() => setOpenPicker("sport")} />
            <SelectField label="Categoria" value={clubLeagueCategory} placeholder="Seleziona categoria" onPress={() => setOpenPicker("category")} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>Anno di fondazione</Text>
              <TextInput placeholder="2025" value={clubFoundationYear} onChangeText={setClubFoundationYear} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontWeight: "600" }}>Stadio o impianto</Text>
              <TextInput placeholder="Nome stadio" value={clubStadium} onChangeText={setClubStadium} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600" }}>Indirizzo stadio</Text>
            <TextInput placeholder="Indirizzo stadio" value={clubStadiumAddress} onChangeText={setClubStadiumAddress} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600" }}>Biografia del club</Text>
            <TextInput placeholder="Biografia del club" value={bio} onChangeText={setBio} multiline style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: "top" }} />
          </View>
        </View>

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

      <PickerModal visible={openPicker === "country"} title="Nazione del club" options={countryOptions} selectedValue={country} onClose={() => setOpenPicker(null)} onSelect={setCountry} />
      <PickerModal visible={openPicker === "sport"} title="Sport del club" options={sportOptions} selectedValue={sport} onClose={() => setOpenPicker(null)} onSelect={setSport} />
      <PickerModal visible={openPicker === "category"} title="Categoria" options={categoryOptions} selectedValue={clubLeagueCategory} onClose={() => setOpenPicker(null)} onSelect={setClubLeagueCategory} />
    </>
  );
}
