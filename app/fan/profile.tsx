import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { AvatarUploader } from "../../components/profiles/AvatarUploader";
import { LocationFields } from "../../components/profiles/LocationFields";
import { fetchProfileMe, patchProfileMe, type ProfileMe, useWebSession } from "../../src/lib/api";
import { theme } from "../../src/theme";

type LocationValue = {
  region_id: number | null;
  province_id: number | null;
  municipality_id: number | null;
  region_label: string | null;
  province_label: string | null;
  city_label: string | null;
};

function emptyLocation(): LocationValue {
  return {
    region_id: null,
    province_id: null,
    municipality_id: null,
    region_label: null,
    province_label: null,
    city_label: null,
  };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default function FanProfileScreen() {
  const web = useWebSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [country, setCountry] = useState("IT");
  const [interestCountry, setInterestCountry] = useState("IT");
  const [interest, setInterest] = useState<LocationValue>(emptyLocation());

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetchProfileMe();
    if (!response.ok || !response.data) {
      setError(response.errorText ?? "Impossibile caricare il profilo fan");
      setLoading(false);
      return;
    }

    const data = response.data as ProfileMe;
    setFullName(asText(data.full_name || data.display_name));
    setAvatarUrl(typeof data.avatar_url === "string" ? data.avatar_url : null);
    setCountry(asText(data.country || "IT") || "IT");
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
  }, []);

  useEffect(() => {
    if (!web.ready) return;
    void loadProfile();
  }, [loadProfile, web.ready]);

  const disabled = useMemo(() => !web.ready || loading || saving, [loading, saving, web.ready]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const normalizedName = fullName.trim() || null;

    const response = await patchProfileMe({
      account_type: "fan",
      full_name: normalizedName,
      display_name: normalizedName,
      avatar_url: avatarUrl,
      country: country || "IT",
      interest_country: interestCountry || "IT",
      interest_region_id: interest.region_id,
      interest_province_id: interest.province_id,
      interest_municipality_id: interest.municipality_id,
      interest_region: interest.region_label,
      interest_province: interest.province_label,
      interest_city: interest.city_label,

      // pulizia campi non fan
      bio: null,
      links: null,
      skills: [],
      birth_year: null,
      birth_place: null,
      birth_country: null,
      birth_region_id: null,
      birth_province_id: null,
      birth_municipality_id: null,
      residence_region_id: null,
      residence_province_id: null,
      residence_municipality_id: null,
      foot: null,
      height_cm: null,
      weight_kg: null,
      sport: null,
      role: null,
      club_foundation_year: null,
      club_stadium: null,
      club_stadium_address: null,
      club_stadium_lat: null,
      club_stadium_lng: null,
      club_league_category: null,
      club_motto: null,
    });

    setSaving(false);

    if (!response.ok) {
      setError(response.errorText ?? "Salvataggio fallito");
      Alert.alert("Errore", response.errorText ?? "Salvataggio fallito");
      return;
    }

    setSuccess("Profilo fan aggiornato");
  }, [avatarUrl, country, fullName, interest.city_label, interest.municipality_id, interest.province_id, interest.province_label, interest.region_id, interest.region_label, interestCountry]);

  if (web.loading || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48, gap: 12 }}
    >
      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.text }}>Il mio profilo Fan</Text>
        <Text style={{ color: theme.colors.muted }}>Aggiorna i dati principali per personalizzare feed e suggerimenti.</Text>
      </View>

      {web.error ? <Text style={{ color: theme.colors.danger }}>{web.error}</Text> : null}
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      {success ? <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>{success}</Text> : null}

      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />

      <View style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>Dati personali</Text>

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Nome e cognome</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Es. Mario Rossi"
            style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 }}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "600", color: theme.colors.primary }}>Nazionalità</Text>
          <TextInput
            value={country}
            onChangeText={(value) => setCountry(value.toUpperCase())}
            autoCapitalize="characters"
            maxLength={2}
            style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 }}
          />
        </View>
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.primary }}>Zona di interesse</Text>
        <TextInput
          value={interestCountry}
          onChangeText={(value) => setInterestCountry(value.toUpperCase())}
          autoCapitalize="characters"
          maxLength={2}
          style={{ borderWidth: 1, borderColor: theme.colors.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 }}
        />

        <LocationFields mode="player" title="Area di interesse" values={interest} onChange={setInterest} />
      </View>

      <Pressable
        disabled={disabled}
        onPress={() => {
          void onSave();
        }}
        style={{
          backgroundColor: disabled ? theme.colors.muted : theme.colors.text,
          borderRadius: 10,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{saving ? "Salvo..." : "Salva profilo"}</Text>
      </Pressable>
    </ScrollView>
  );
}
