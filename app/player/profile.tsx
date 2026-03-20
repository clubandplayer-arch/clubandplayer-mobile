import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { AvatarUploader } from "../../components/profiles/AvatarUploader";
import { LocationFields } from "../../components/profiles/LocationFields";
import { fetchProfileMe, patchProfileMe, type ProfileMe, useWebSession, useWhoami } from "../../src/lib/api";
import { ProfileSocialInputs } from "../../src/components/profiles/ProfileSections";
import { normalizeProfileSkills, parseProfileLinks, stringifyProfileLinks, stringifyProfileSkills } from "../../src/components/profiles/profileShared";
import { theme } from "../../src/theme";

function asText(v: unknown) { return typeof v === "string" ? v : ""; }
function asNumText(v: unknown) { return v === null || v === undefined ? "" : String(v); }
const emptyLocation = { region_id: null as number | null, province_id: null as number | null, municipality_id: null as number | null, region_label: null as string | null, province_label: null as string | null, city_label: null as string | null };

export default function PlayerProfileScreen() {
  const web = useWebSession();
  const whoami = useWhoami(web.ready);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMe | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [sport, setSport] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [foot, setFoot] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [skills, setSkills] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [birthCountry, setBirthCountry] = useState("IT");
  const [interestCountry, setInterestCountry] = useState("IT");
  const [links, setLinks] = useState(parseProfileLinks(null));
  const [residence, setResidence] = useState({ ...emptyLocation });
  const [birthLocation, setBirthLocation] = useState({ ...emptyLocation });
  const [interest, setInterest] = useState({ ...emptyLocation });

  useEffect(() => {
    const role = String(whoami.data?.role ?? "").trim().toLowerCase();
    if (role === "club") router.replace("/club/profile");
  }, [whoami.data?.role]);

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
    setProfile(data);
    setAvatarUrl(data.avatar_url ?? null);
    setFullName(asText(data.full_name || data.display_name));
    setBirthYear(asNumText(data.birth_year));
    setBirthPlace(asText(data.birth_place));
    setCountry(asText(data.country));
    setCity(asText(data.city));
    setSport(asText(data.sport));
    setRole(asText(data.role));
    setBio(asText(data.bio));
    setFoot(asText(data.foot));
    setHeightCm(asNumText(data.height_cm));
    setWeightKg(asNumText(data.weight_kg));
    setSkills(stringifyProfileSkills(data.skills));
    setLinks(parseProfileLinks(data.links));
    setNotifyEmail(Boolean(data.notify_email_new_message));
    setBirthCountry(asText(data.birth_country || "IT") || "IT");
    setInterestCountry(asText(data.interest_country || "IT") || "IT");
    setResidence({ region_id: data.residence_region_id ?? null, province_id: data.residence_province_id ?? null, municipality_id: data.residence_municipality_id ?? null, region_label: data.region ?? null, province_label: data.province ?? null, city_label: data.city ?? null });
    setBirthLocation({ region_id: data.birth_region_id ?? null, province_id: data.birth_province_id ?? null, municipality_id: data.birth_municipality_id ?? null, region_label: null, province_label: null, city_label: null });
    setInterest({ region_id: data.interest_region_id ?? null, province_id: data.interest_province_id ?? null, municipality_id: data.interest_municipality_id ?? null, region_label: data.interest_region ?? null, province_label: data.interest_province ?? null, city_label: data.interest_city ?? null });
    setLoading(false);
  }, []);

  useEffect(() => { if (web.ready) void loadProfile(); }, [loadProfile, web.ready]);

  const onSave = useCallback(async () => {
    setSaving(true);
    const response = await patchProfileMe({
      account_type: profile?.account_type ?? "athlete",
      avatar_url: avatarUrl,
      full_name: fullName,
      display_name: fullName,
      birth_year: birthYear,
      birth_place: birthPlace,
      country,
      city,
      region: residence.region_label,
      province: residence.province_label,
      residence_region_id: residence.region_id,
      residence_province_id: residence.province_id,
      residence_municipality_id: residence.municipality_id,
      sport,
      role,
      bio,
      foot,
      height_cm: heightCm,
      weight_kg: weightKg,
      skills: normalizeProfileSkills(skills),
      links: stringifyProfileLinks(links),
      notify_email_new_message: notifyEmail,
      birth_country: birthCountry,
      birth_region_id: birthLocation.region_id,
      birth_province_id: birthLocation.province_id,
      birth_municipality_id: birthLocation.municipality_id,
      interest_country: interestCountry,
      interest_region_id: interest.region_id,
      interest_province_id: interest.province_id,
      interest_municipality_id: interest.municipality_id,
      interest_region: interest.region_label,
      interest_province: interest.province_label,
      interest_city: interest.city_label,
    });
    setSaving(false);
    if (!response.ok) return Alert.alert("Errore", response.errorText ?? "Salvataggio fallito");
    Alert.alert("Salvato", "Profilo aggiornato");
    await loadProfile();
  }, [profile, avatarUrl, fullName, birthYear, birthPlace, country, city, residence, sport, role, bio, foot, heightCm, weightKg, skills, links, notifyEmail, birthCountry, birthLocation, interestCountry, interest, loadProfile]);

  const disabled = useMemo(() => saving || loading || !web.ready, [loading, saving, web.ready]);
  if (web.loading || whoami.loading || loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 48, paddingTop: 12 }} style={{ backgroundColor: theme.colors.background }}>
      {web.error ? <Text style={{ color: theme.colors.danger }}>{web.error}</Text> : null}
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <TextInput placeholder="Nome completo" value={fullName} onChangeText={setFullName} style={styles.input} />
        <TextInput placeholder="Anno nascita" value={birthYear} onChangeText={setBirthYear} keyboardType="numeric" style={styles.input} />
        <TextInput placeholder="Luogo di nascita" value={birthPlace} onChangeText={setBirthPlace} style={styles.input} />
        <TextInput placeholder="Paese" value={country} onChangeText={setCountry} style={styles.input} />
        <TextInput placeholder="Città" value={city} onChangeText={setCity} style={styles.input} />
        <TextInput placeholder="Sport" value={sport} onChangeText={setSport} style={styles.input} />
        <TextInput placeholder="Ruolo" value={role} onChangeText={setRole} style={styles.input} />
        <TextInput placeholder="Bio" value={bio} onChangeText={setBio} multiline style={[styles.input, { minHeight: 80 }]} />
        <TextInput placeholder="Piede" value={foot} onChangeText={setFoot} style={styles.input} />
        <TextInput placeholder="Altezza (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" style={styles.input} />
        <TextInput placeholder="Peso (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" style={styles.input} />
        <TextInput placeholder="Competenze (una per riga)" value={skills} onChangeText={setSkills} multiline style={[styles.input, { minHeight: 88 }]} />
      </View>
      <LocationFields mode="player" title="Residenza" values={residence} onChange={setResidence} />
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontWeight: "700" }}>Paese di nascita</Text>
        <TextInput placeholder="Paese di nascita" value={birthCountry} onChangeText={setBirthCountry} style={styles.input} />
      </View>
      <LocationFields mode="player" title="Luogo di nascita" values={birthLocation} onChange={setBirthLocation} />
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontWeight: "700" }}>Paese di interesse</Text>
        <TextInput placeholder="Paese di interesse" value={interestCountry} onChangeText={setInterestCountry} style={styles.input} />
      </View>
      <LocationFields mode="player" title="Località di interesse" values={interest} onChange={setInterest} />
      <ProfileSocialInputs value={links} onChange={setLinks} />
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text>Notifica email nuovi messaggi</Text>
          <Switch value={notifyEmail} onValueChange={setNotifyEmail} />
        </View>
      </View>
      <Pressable disabled={disabled} onPress={() => void onSave()} style={{ backgroundColor: disabled ? theme.colors.muted : theme.colors.text, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
        <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{saving ? "Salvo..." : "Salva"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = {
  input: { borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 },
} as const;
