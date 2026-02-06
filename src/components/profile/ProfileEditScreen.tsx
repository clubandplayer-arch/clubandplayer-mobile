import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  fetchProfileMe,
  fetchWhoami,
  patchProfileMe,
  type ProfileMe,
  type ProfileMePatch,
} from "../../lib/api";

type ProfileMode = "player" | "club";

type FormState = {
  display_name: string;
  full_name: string;
  bio: string;
  sport: string;
  role: string;
  country: string;
  city: string;
  club_foundation_year: string;
  club_stadium: string;
  club_stadium_address: string;
  club_league_category: string;
  club_motto: string;
};

const emptyForm: FormState = {
  display_name: "",
  full_name: "",
  bio: "",
  sport: "",
  role: "",
  country: "",
  city: "",
  club_foundation_year: "",
  club_stadium: "",
  club_stadium_address: "",
  club_league_category: "",
  club_motto: "",
};

function normalizeRole(role: string | null | undefined) {
  return (role ?? "").toLowerCase();
}

function isClubRole(role: string | null | undefined) {
  return normalizeRole(role) === "club";
}

function isPlayerRole(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return normalized === "player" || normalized === "athlete";
}

function cleanString(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function fieldLabel(mode: ProfileMode) {
  return mode === "club" ? "Profilo club" : "Profilo player";
}

export function ProfileEditScreen({ mode }: { mode: ProfileMode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileMe | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whoamiRole, setWhoamiRole] = useState<string | null>(null);

  const screenTitle = useMemo(() => fieldLabel(mode), [mode]);

  const applyProfileToForm = useCallback((data: ProfileMe | null) => {
    if (!data) {
      setForm(emptyForm);
      return;
    }
    setForm({
      display_name: data.display_name ?? "",
      full_name: data.full_name ?? "",
      bio: data.bio ?? "",
      sport: data.sport ?? "",
      role: data.role ?? "",
      country: data.country ?? "",
      city: data.city ?? "",
      club_foundation_year:
        typeof data.club_foundation_year === "number"
          ? String(data.club_foundation_year)
          : "",
      club_stadium: data.club_stadium ?? "",
      club_stadium_address: data.club_stadium_address ?? "",
      club_league_category: data.club_league_category ?? "",
      club_motto: data.club_motto ?? "",
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setError(null);
    const [whoamiResponse, profileResponse] = await Promise.all([
      fetchWhoami(),
      fetchProfileMe(),
    ]);

    if (whoamiResponse.ok) {
      const role = whoamiResponse.data?.role ?? null;
      setWhoamiRole(role);
    } else {
      setWhoamiRole(null);
      setError(whoamiResponse.errorText ?? "Errore nel caricamento del ruolo");
    }

    if (profileResponse.ok) {
      const loaded = profileResponse.data?.data ?? null;
      setProfile(loaded);
      applyProfileToForm(loaded);
    } else {
      setProfile(null);
      setError(profileResponse.errorText ?? "Errore nel caricamento profilo");
    }
  }, [applyProfileToForm]);

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, [loadProfile]);

  useEffect(() => {
    if (!whoamiRole) return;
    if (mode === "player" && isClubRole(whoamiRole)) {
      router.replace("/club/profile");
    }
    if (mode === "club" && !isClubRole(whoamiRole) && isPlayerRole(whoamiRole)) {
      router.replace("/player/profile");
    }
  }, [mode, router, whoamiRole]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const updateField = useCallback(
    (key: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload: ProfileMePatch = {
        display_name: cleanString(form.display_name),
        full_name: cleanString(form.full_name),
        bio: cleanString(form.bio),
        sport: cleanString(form.sport),
        role: cleanString(form.role),
        country: cleanString(form.country),
        city: cleanString(form.city),
      };

      if (mode === "club") {
        payload.club_foundation_year = parseNumber(form.club_foundation_year);
        payload.club_stadium = cleanString(form.club_stadium);
        payload.club_stadium_address = cleanString(form.club_stadium_address);
        payload.club_league_category = cleanString(form.club_league_category);
        payload.club_motto = cleanString(form.club_motto);
      }

      const response = await patchProfileMe(payload);
      if (!response.ok) {
        Alert.alert("Errore", response.errorText ?? "Salvataggio fallito");
        return;
      }
      const updated = response.data?.data ?? null;
      setProfile(updated);
      applyProfileToForm(updated);
      Alert.alert("Profilo", "Modifiche salvate.");
    } finally {
      setSaving(false);
    }
  }, [applyProfileToForm, form, mode]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={{ fontSize: 26, fontWeight: "800" }}>{screenTitle}</Text>

      {error ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#fecaca",
            backgroundColor: "#fff5f5",
            borderRadius: 12,
            padding: 14,
            gap: 6,
          }}
        >
          <Text style={{ fontWeight: "800", color: "#b91c1c" }}>Errore</Text>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>
          Dati principali
        </Text>

        <InputField
          label="Display name"
          value={form.display_name}
          onChangeText={(text) => updateField("display_name", text)}
        />
        <InputField
          label="Nome completo"
          value={form.full_name}
          onChangeText={(text) => updateField("full_name", text)}
        />
        <InputField
          label="Bio"
          value={form.bio}
          multiline
          onChangeText={(text) => updateField("bio", text)}
        />
        <InputField
          label="Sport"
          value={form.sport}
          onChangeText={(text) => updateField("sport", text)}
        />
        <InputField
          label="Ruolo"
          value={form.role}
          onChangeText={(text) => updateField("role", text)}
        />
        <InputField
          label="Paese"
          value={form.country}
          onChangeText={(text) => updateField("country", text)}
        />
        <InputField
          label="Città"
          value={form.city}
          onChangeText={(text) => updateField("city", text)}
        />
      </View>

      {mode === "club" ? (
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Dati club</Text>
          <InputField
            label="Anno fondazione"
            value={form.club_foundation_year}
            keyboardType="number-pad"
            onChangeText={(text) => updateField("club_foundation_year", text)}
          />
          <InputField
            label="Stadio"
            value={form.club_stadium}
            onChangeText={(text) => updateField("club_stadium", text)}
          />
          <InputField
            label="Indirizzo stadio"
            value={form.club_stadium_address}
            onChangeText={(text) => updateField("club_stadium_address", text)}
          />
          <InputField
            label="Categoria campionato"
            value={form.club_league_category}
            onChangeText={(text) => updateField("club_league_category", text)}
          />
          <InputField
            label="Motto"
            value={form.club_motto}
            onChangeText={(text) => updateField("club_motto", text)}
          />
        </View>
      ) : null}

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={{
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: saving ? "#9ca3af" : "#111827",
          alignItems: "center",
        }}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={{ color: "#ffffff", fontWeight: "800" }}>
            Salva profilo
          </Text>
        )}
      </Pressable>

      {profile?.display_name ? (
        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          Ultimo profilo: {profile.display_name}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, fontWeight: "700" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 8,
          minHeight: multiline ? 96 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
