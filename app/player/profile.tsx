import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { fetchProfileMe, fetchWhoami, patchProfileMe, type ProfileMe } from "../../src/lib/api";

export default function PlayerProfileScreen() {
  const router = useRouter();
  const [roleChecked, setRoleChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileMe | null>(null);

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let active = true;
    const checkRole = async () => {
      const response = await fetchWhoami();
      if (!active) return;
      if (response.ok && response.data?.role === "club") {
        router.replace("/club/profile");
        return;
      }
      setRoleChecked(true);
    };
    checkRole();
    return () => {
      active = false;
    };
  }, [router]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchProfileMe();
    if (response.ok) {
      const data = response.data ?? null;
      setProfile(data);
      setDisplayName(data?.display_name ?? "");
    } else {
      setProfile(null);
      setError(response.errorText ?? "Errore caricamento profilo.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!roleChecked) return;
    void loadProfile();
  }, [loadProfile, roleChecked]);

  const onSave = useCallback(async () => {
    setSaving(true);
    const response = await patchProfileMe({
      display_name: displayName.trim() || null,
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
    Alert.alert("Salvato", "Profilo aggiornato.");
  }, [displayName, profile]);

  if (!roleChecked || loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>
          Reindirizzamento…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Profilo Player</Text>

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
