import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchProfileMe, patchProfileMe, type ProfileMe } from "../../src/lib/api";

export default function ClubProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMe | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [clubStadium, setClubStadium] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchProfileMe();
    if (response.ok) {
      const data = response.data ?? null;
      setProfile(data);
      setDisplayName(data?.display_name ?? "");
      setClubStadium(data?.club_stadium ?? "");
    } else {
      setProfile(null);
      setError(response.errorText ?? "Errore caricamento profilo.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSave = useCallback(async () => {
    setSaving(true);
    const response = await patchProfileMe({
      display_name: displayName.trim() || null,
      club_stadium: clubStadium.trim() || null,
    });
    setSaving(false);
    if (!response.ok) {
      Alert.alert("Errore", response.errorText ?? "Salvataggio fallito.");
      return;
    }
    const data = response.data ?? profile;
    setProfile(data ?? null);
    if (data?.display_name !== undefined && data?.display_name !== null) {
      setDisplayName(data.display_name);
    }
    if (data?.club_stadium !== undefined && data?.club_stadium !== null) {
      setClubStadium(data.club_stadium);
    }
    Alert.alert("Salvato", "Profilo aggiornato.");
  }, [clubStadium, displayName, profile]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Profilo Club</Text>

      {error ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#fecaca", borderRadius: 10 }}>
          <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
            {error}
          </Text>
        </View>
      ) : null}

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Dati base</Text>
        <Text style={{ color: "#6b7280" }}>
          Nome completo: {profile?.full_name ?? "—"}
        </Text>
        <Text style={{ color: "#6b7280" }}>
          Tipo account: {profile?.account_type ?? "—"}
        </Text>
        <Text style={{ color: "#6b7280" }}>
          Ruolo: {profile?.role ?? "—"}
        </Text>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Inserisci display name"
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Stadio</Text>
        <TextInput
          value={clubStadium}
          onChangeText={setClubStadium}
          placeholder="Nome stadio"
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          Campo salvato via PATCH /api/profiles/me
        </Text>
      </View>

      <Pressable
        disabled={saving}
        onPress={() => void onSave()}
        style={{
          backgroundColor: saving ? "#9ca3af" : "#111827",
          borderRadius: 10,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700" }}>
          {saving ? "Salvo..." : "Salva"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
