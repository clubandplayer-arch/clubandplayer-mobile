import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { fetchMyProfile, fetchWhoami, patchMyProfile } from "../../src/lib/api";
import {
  PROFILE_PATCH_FIELDS,
  type ProfilePatchField,
} from "../../src/lib/profiles/myProfileFields";

type WhoamiProfile = {
  account_type?: string | null;
  type?: string | null;
};

type ProfilePayload = Record<string, unknown>;

type FieldConfig = {
  key: ProfilePatchField;
  label: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
};

const COMMON_FIELDS: FieldConfig[] = [
  { key: "display_name", label: "Display name" },
  { key: "full_name", label: "Nome completo" },
  { key: "bio", label: "Bio", multiline: true },
  { key: "country", label: "Paese" },
  { key: "region", label: "Regione" },
  { key: "province", label: "Provincia" },
  { key: "city", label: "Città" },
  { key: "sport", label: "Sport" },
  { key: "role", label: "Ruolo" },
  { key: "skills", label: "Skills (separate da virgola)" },
  { key: "links", label: "Links (separati da virgola)" },
];

const NUMERIC_FIELDS = new Set<ProfilePatchField>(["club_foundation_year"]);

function resolveAccountType(profile: unknown, role: string | null): string | null {
  if (role) return role;
  if (!profile || typeof profile !== "object") return null;
  const candidate = profile as WhoamiProfile;
  return candidate.account_type ?? candidate.type ?? null;
}

function isClubAccount(profile: unknown, role: string | null): boolean {
  const accountType = resolveAccountType(profile, role);
  return accountType === "club";
}

function toText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeList(value: string): string[] | null {
  const items = value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function normalizeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInitialForm(profile: ProfilePayload | null, fields: FieldConfig[]) {
  return fields.reduce<Record<ProfilePatchField, string>>((acc, field) => {
    acc[field.key] = toText(profile?.[field.key]);
    return acc;
  }, {} as Record<ProfilePatchField, string>);
}

function buildPayload(
  form: Record<ProfilePatchField, string>,
  fields: FieldConfig[],
): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    const raw = form[field.key] ?? "";
    if (field.key === "skills" || field.key === "links") {
      acc[field.key] = normalizeList(raw);
      return acc;
    }
    if (NUMERIC_FIELDS.has(field.key)) {
      acc[field.key] = normalizeNumber(raw);
      return acc;
    }
    acc[field.key] = normalizeText(raw);
    return acc;
  }, {});
}

export default function PlayerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [form, setForm] = useState<Record<ProfilePatchField, string>>(() =>
    buildInitialForm(null, COMMON_FIELDS),
  );

  const allowedFields = useMemo(
    () => new Set<ProfilePatchField>(PROFILE_PATCH_FIELDS),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSaveError(null);

      const whoami = await fetchWhoami();
      if (!whoami.ok) {
        if (!isMounted) return;
        setError(whoami.errorText ?? "Errore nel caricamento profilo");
        setLoading(false);
        return;
      }

      const profileInfo = whoami.data?.profile ?? null;
      const role = whoami.data?.role ?? null;
      if (isClubAccount(profileInfo, role)) {
        router.replace("/club/profile");
        return;
      }

      const response = await fetchMyProfile();
      if (!isMounted) return;

      if (!response.ok) {
        setError(response.errorText ?? `Errore HTTP ${response.status}`);
        setLoading(false);
        return;
      }

      const payload = (response.data as { data?: ProfilePayload } | undefined)?.data ?? null;
      setProfile(payload);
      setForm(buildInitialForm(payload, COMMON_FIELDS));
      setLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const onChange = (key: ProfilePatchField, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);

    const payload = buildPayload(form, COMMON_FIELDS);
    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => allowedFields.has(key as ProfilePatchField)),
    );

    const response = await patchMyProfile(sanitizedPayload);
    if (!response.ok) {
      setSaveError(response.errorText ?? `Errore HTTP ${response.status}`);
      setSaving(false);
      return;
    }

    const refreshed = await fetchMyProfile();
    if (refreshed.ok) {
      const nextProfile =
        (refreshed.data as { data?: ProfilePayload } | undefined)?.data ?? null;
      setProfile(nextProfile);
      setForm(buildInitialForm(nextProfile, COMMON_FIELDS));
    }

    setSaving(false);
  };

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
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Profilo giocatore</Text>

      {error && (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#ef4444",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ color: "#991b1b", fontWeight: "700" }}>{error}</Text>
        </View>
      )}

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        {COMMON_FIELDS.map((field) => (
          <View key={field.key} style={{ gap: 6 }}>
            <Text style={{ fontWeight: "700" }}>{field.label}</Text>
            <TextInput
              value={form[field.key] ?? ""}
              onChangeText={(value) => onChange(field.key, value)}
              multiline={field.multiline}
              keyboardType={field.keyboardType ?? "default"}
              style={{
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
                minHeight: field.multiline ? 80 : undefined,
                textAlignVertical: field.multiline ? "top" : "center",
              }}
            />
          </View>
        ))}
      </View>

      {saveError && (
        <Text style={{ color: "#b91c1c", fontWeight: "700" }}>{saveError}</Text>
      )}

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={{
          backgroundColor: "#0A66C2",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>Salva</Text>
        )}
      </Pressable>

      {profile && (
        <Text style={{ color: "#6b7280", fontSize: 12 }}>
          account_type: {(profile.account_type ?? profile.type ?? "—").toString()}
        </Text>
      )}
    </ScrollView>
  );
}
