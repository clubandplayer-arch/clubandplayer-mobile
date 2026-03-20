import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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

export default function ClubProfileScreen() {
  const router = useRouter();
  const web = useWebSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [sport, setSport] = useState("");
  const [clubMotto, setClubMotto] = useState("");
  const [clubLeagueCategory, setClubLeagueCategory] = useState("");
  const [clubFoundationYear, setClubFoundationYear] = useState("");
  const [clubStadium, setClubStadium] = useState("");
  const [clubStadiumAddress, setClubStadiumAddress] = useState("");
  const [bio, setBio] = useState("");

  const [residence, setResidence] = useState({
    region_id: null as number | null,
    province_id: null as number | null,
    municipality_id: null as number | null,
    region_label: null as string | null,
    province_label: null as string | null,
    city_label: null as string | null,
  });

  const [interest, setInterest] = useState({
    region_id: null as number | null,
    province_id: null as number | null,
    municipality_id: null as number | null,
    region_label: null as string | null,
    province_label: null as string | null,
    city_label: null as string | null,
  });

  const [interestCountry, setInterestCountry] = useState("IT");

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
    setCountry(asText(data.country));
    setSport(asText(data.sport));
    setClubMotto(asText(data.club_motto));
    setClubLeagueCategory(asText(data.club_league_category));
    setClubFoundationYear(asNumText(data.club_foundation_year));
    setClubStadium(asText(data.club_stadium));
    setClubStadiumAddress(asText(data.club_stadium_address));
    setBio(asText(data.bio));
    setInterestCountry(asText(data.interest_country || "IT") || "IT");

    setResidence({
      region_id: data.residence_region_id ?? null,
      province_id: data.residence_province_id ?? null,
      municipality_id: data.residence_municipality_id ?? null,
      region_label: data.region ?? null,
      province_label: data.province ?? null,
      city_label: data.city ?? null,
    });

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
      country,
      region: residence.region_label,
      province: residence.province_label,
      city: residence.city_label,
      residence_region_id: residence.region_id,
      residence_province_id: residence.province_id,
      residence_municipality_id: residence.municipality_id,
      interest_country: interestCountry,
      interest_region_id: interest.region_id,
      interest_province_id: interest.province_id,
      interest_municipality_id: interest.municipality_id,
      interest_region: interest.region_label,
      interest_province: interest.province_label,
      interest_city: interest.city_label,
      club_motto: clubMotto,
      sport,
      club_league_category: clubLeagueCategory,
      club_foundation_year: clubFoundationYear,
      club_stadium: clubStadium,
      club_stadium_address: clubStadiumAddress,
      bio,
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
    interest.city_label,
    interest.municipality_id,
    interest.province_id,
    interest.province_label,
    interest.region_id,
    interest.region_label,
    interestCountry,
    loadProfile,
    residence.city_label,
    residence.municipality_id,
    residence.province_id,
    residence.province_label,
    residence.region_id,
    residence.region_label,
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
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 48, paddingTop: 12 }} style={{ backgroundColor: theme.colors.background }}>
      {web.error ? <Text style={{ color: theme.colors.danger }}>{web.error}</Text> : null}
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <TextInput placeholder="Nome club" value={fullName} onChangeText={setFullName} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Paese" value={country} onChangeText={setCountry} autoCapitalize="characters" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Motto" value={clubMotto} onChangeText={setClubMotto} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Sport" value={sport} onChangeText={setSport} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Categoria campionato" value={clubLeagueCategory} onChangeText={setClubLeagueCategory} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Anno di fondazione" value={clubFoundationYear} onChangeText={setClubFoundationYear} keyboardType="numeric" style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Stadio" value={clubStadium} onChangeText={setClubStadium} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Indirizzo stadio" value={clubStadiumAddress} onChangeText={setClubStadiumAddress} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }} />
        <TextInput placeholder="Bio" value={bio} onChangeText={setBio} multiline style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10, minHeight: 80 }} />
      </View>

      <LocationFields mode="club" title="Sede club" values={residence} onChange={setResidence} />

      <LocationFields mode="club" title="Area di interesse" values={interest} onChange={setInterest} />

      <Pressable disabled={disabled} onPress={() => void onSave()} style={{ backgroundColor: disabled ? theme.colors.muted : theme.colors.text, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}>
        <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{saving ? "Salvo..." : "Salva"}</Text>
      </Pressable>
    </ScrollView>
  );
}
