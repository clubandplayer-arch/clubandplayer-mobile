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
import { useRouter } from "expo-router";
import { AvatarUploader } from "../../components/profiles/AvatarUploader";
import { LocationFields } from "../../components/profiles/LocationFields";
import { fetchProfileMe, patchProfileMe, type ProfileMe, useWebSession } from "../../src/lib/api";
import { theme } from "../../src/theme";

function asText(v: unknown) {
  return typeof v === "string" ? v : "";
}

function asNumText(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatLinksText(value: unknown) {
  if (!Array.isArray(value)) return "";

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const record = item as { label?: unknown; url?: unknown };
        const label = typeof record.label === "string" ? record.label.trim() : "";
        const url = typeof record.url === "string" ? record.url.trim() : "";
        if (label && url) return `${label}: ${url}`;
        return url || label;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseLinksText(value: string) {
  const rows = value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);

  return rows.map((row) => {
    const match = row.match(/^([^:]+):\s*(https?:\/\/.*)$/i);
    if (match) {
      return { label: match[1].trim(), url: match[2].trim() };
    }
    return { label: "Social", url: row };
  });
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const web = useWebSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [country, setCountry] = useState("");
  const [sport, setSport] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [foot, setFoot] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [skills, setSkills] = useState("");
  const [links, setLinks] = useState("");
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
    setCountry(asText(data.country));
    setSport(asText(data.sport));
    setRole(asText(data.role));
    setBio(asText(data.bio));
    setFoot(asText(data.foot));
    setHeightCm(asNumText(data.height_cm));
    setWeightKg(asNumText(data.weight_kg));
    setSkills(Array.isArray(data.skills) ? data.skills.join(", ") : asText(data.skills));
    setLinks(formatLinksText(data.links));
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
      skills,
      links: JSON.stringify(parseLinksText(links)),
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
    links,
    loadProfile,
    notifyEmail,
    role,
    skills,
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
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 48, paddingTop: 12 }} style={{ backgroundColor: theme.colors.background }}>
      {web.error ? <Text style={{ color: theme.colors.danger }}>{web.error}</Text> : null}
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <TextInput placeholder="Nome completo" value={fullName} onChangeText={setFullName} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Anno nascita" value={birthYear} onChangeText={setBirthYear} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Paese" value={country} onChangeText={setCountry} autoCapitalize="characters" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Sport" value={sport} onChangeText={setSport} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Ruolo" value={role} onChangeText={setRole} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Bio" value={bio} onChangeText={setBio} multiline style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10, minHeight: 80 }} />
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Dettagli atleta</Text>
        <TextInput placeholder="Piede" value={foot} onChangeText={setFoot} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Altezza (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Peso (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Skills (separate da virgola)" value={skills} onChangeText={setSkills} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
      </View>

      <LocationFields mode="player" title="Zona di interesse" values={interest} onChange={setInterest} />

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Profili social</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Inserisci un profilo per riga. Puoi usare anche il formato `Label: https://...`.</Text>
        <TextInput placeholder="Instagram: https://..." value={links} onChangeText={setLinks} multiline autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10, minHeight: 96, textAlignVertical: "top" }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontWeight: "600" }}>Notifiche email nuovi messaggi</Text>
          <Switch value={notifyEmail} onValueChange={setNotifyEmail} />
        </View>
      </View>

      <Pressable disabled={disabled} onPress={() => void onSave()} style={{ backgroundColor: disabled ? theme.colors.muted : theme.colors.text, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
        <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{saving ? "Salvo..." : "Salva"}</Text>
      </Pressable>
    </ScrollView>
  );
}
