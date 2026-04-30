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
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";

import { LocationFields } from "../components/profiles/LocationFields";
import { clearSession, deleteAccount, fetchProfileMe, patchProfileMe, type ProfileMe, useWebSession } from "../src/lib/api";
import { normalizeAccountType, profileCanonicalHref } from "../src/lib/nav/profileLinks";
import { supabase } from "../src/lib/supabase";
import { theme } from "../src/theme";

const WEB_BASE_URL = "https://www.clubandplayer.com";

type LocationValue = {
  region_id: number | null;
  province_id: number | null;
  municipality_id: number | null;
  region_label: string | null;
  province_label: string | null;
  city_label: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

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

export default function SettingsScreen() {
  const router = useRouter();
  const web = useWebSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"club" | "player" | "fan" | null>(null);
  const [interestCountry, setInterestCountry] = useState("IT");
  const [interest, setInterest] = useState<LocationValue>(emptyLocation());
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const response = await fetchProfileMe();
    if (!response.ok || !response.data) {
      setError(response.errorText ?? "Errore caricamento impostazioni");
      setLoading(false);
      return;
    }

    const data = response.data as ProfileMe;
    setProfileId(typeof data.id === "string" && data.id.trim() ? data.id : null);
    setAccountType(normalizeAccountType(data.account_type));
    setInterestCountry(asText(data.interest_country || "IT") || "IT");
    setInterest({
      region_id: data.interest_region_id ?? null,
      province_id: data.interest_province_id ?? null,
      municipality_id: data.interest_municipality_id ?? null,
      region_label: data.interest_region ?? null,
      province_label: data.interest_province ?? null,
      city_label: data.interest_city ?? null,
    });
    setNotifyEmail(Boolean(data.notify_email_new_message));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!web.ready) return;
    void loadSettings();
  }, [loadSettings, web.ready]);

  const publicProfilePath = useMemo(() => {
    if (!profileId || !accountType) return null;
    return profileCanonicalHref(profileId, accountType);
  }, [accountType, profileId]);

  const publicProfileLabel = useMemo(() => {
    if (accountType === "club") return "Club";
    if (accountType === "player") return "Player";
    if (accountType === "fan") return "Fan";
    return "—";
  }, [accountType]);

  const disabled = useMemo(() => loading || saving || !web.ready, [loading, saving, web.ready]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const response = await patchProfileMe({
      interest_country: interestCountry,
      interest_region_id: interest.region_id,
      interest_province_id: interest.province_id,
      interest_municipality_id: interest.municipality_id,
      interest_region: interest.region_label,
      interest_province: interest.province_label,
      interest_city: interest.city_label,
      notify_email_new_message: notifyEmail,
    });

    setSaving(false);

    if (!response.ok) {
      setError(response.errorText ?? "Salvataggio fallito");
      Alert.alert("Errore", response.errorText ?? "Salvataggio fallito");
      return;
    }

    setSuccessMessage("Impostazioni aggiornate");
  }, [interest.city_label, interest.municipality_id, interest.province_id, interest.province_label, interest.region_id, interest.region_label, interestCountry, notifyEmail]);

  const canDeleteAccount = deleteConfirmText.trim().toUpperCase() === "ELIMINA";

  const runDeleteAccount = useCallback(async () => {
    if (!canDeleteAccount || deletingAccount) return;

    setDeletingAccount(true);
    setError(null);
    setSuccessMessage(null);

    const response = await deleteAccount();

    if (!response.ok) {
      setDeletingAccount(false);
      const message = response.errorText ?? "Eliminazione account non riuscita. Riprova più tardi.";
      setError(message);
      Alert.alert("Errore", message);
      return;
    }

    try {
      await clearSession();
    } catch {
      // no-op
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // no-op
    }

    setDeletingAccount(false);
    Alert.alert("Account eliminato", "Il tuo account Club & Player è stato eliminato.");
    router.replace("/(auth)/login");
  }, [canDeleteAccount, deletingAccount, router]);

  const onDeleteAccountPress = useCallback(() => {
    if (!canDeleteAccount || deletingAccount) return;

    Alert.alert(
      "Conferma eliminazione",
      "Vuoi eliminare definitivamente il tuo account Club & Player?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina account",
          style: "destructive",
          onPress: () => {
            void runDeleteAccount();
          },
        },
      ],
    );
  }, [canDeleteAccount, deletingAccount, runDeleteAccount]);

  const onLogout = useCallback(async () => {
    try {
      await clearSession();
    } catch {
      // no-op
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // no-op
    }

    router.replace("/(auth)/login");
  }, [router]);

  const openWebUrl = useCallback(async (path: string) => {
    await Linking.openURL(`${WEB_BASE_URL}${path}`);
  }, []);

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
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        >
          <Text style={{ fontWeight: "600" }}>Indietro</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace("/(tabs)/feed")}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
        >
          <Text style={{ fontWeight: "600" }}>Vai al feed</Text>
        </Pressable>
      </View>

      {web.error ? <Text style={{ color: theme.colors.danger }}>{web.error}</Text> : null}
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      {successMessage ? <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>{successMessage}</Text> : null}

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Profilo</Text>
        <Text>Tipo account: {publicProfileLabel}</Text>
        {publicProfilePath ? (
          <Link href={publicProfilePath as any} asChild>
            <Pressable style={{ alignSelf: "flex-start", paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Apri profilo pubblico</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Zona di interesse</Text>
        <Text style={{ color: theme.colors.muted }}>Questa preferenza usa gli stessi campi profilo ufficiali del web.</Text>
        <TextInput
          placeholder="Interest country"
          autoCapitalize="characters"
          value={interestCountry}
          onChangeText={setInterestCountry}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }}
        />
        <LocationFields mode={accountType === "club" ? "club" : "player"} title="Interest area" values={interest} onChange={setInterest} />
        <Link href="/profile/location-settings" asChild>
          <Pressable style={{ alignSelf: "flex-start", paddingTop: 4 }}>
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Dettagli località</Text>
          </Pressable>
        </Link>
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Notifiche</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontWeight: "600" }}>Ricevi email per nuovi messaggi</Text>
            <Text style={{ color: theme.colors.muted }}>Invia email quando arriva un nuovo messaggio.</Text>
          </View>
          <Switch value={notifyEmail} onValueChange={setNotifyEmail} />
        </View>
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Sessione</Text>
        <Pressable
          disabled={disabled}
          onPress={() => void onSave()}
          style={{ backgroundColor: disabled ? theme.colors.muted : theme.colors.text, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>{saving ? "Salvo..." : "Salva impostazioni"}</Text>
        </Pressable>
        <Pressable
          onPress={() => void onLogout()}
          style={{ borderWidth: 1, borderColor: theme.colors.danger, borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Logout</Text>
        </Pressable>
      </View>


      <View style={{ borderWidth: 1, borderColor: theme.colors.danger, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.danger }}>Zona pericolosa</Text>
        <Text style={{ color: theme.colors.muted }}>
          L'eliminazione dell'account è irreversibile: perderai profilo, dati e accesso in modo definitivo.
        </Text>
        <Text style={{ fontWeight: "600" }}>Digita ELIMINA per confermare</Text>
        <TextInput
          placeholder="ELIMINA"
          autoCapitalize="characters"
          value={deleteConfirmText}
          onChangeText={setDeleteConfirmText}
          editable={!deletingAccount}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, padding: 10 }}
        />
        <Pressable
          onPress={() => void onDeleteAccountPress()}
          disabled={!canDeleteAccount || deletingAccount}
          style={{
            backgroundColor: !canDeleteAccount || deletingAccount ? theme.colors.muted : theme.colors.danger,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>
            {deletingAccount ? "Eliminazione..." : "Elimina account"}
          </Text>
        </Pressable>
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Legale</Text>
        {[
          { label: "Privacy", path: "/legal/privacy" },
          { label: "Termini", path: "/legal/terms" },
          { label: "Beta", path: "/legal/beta" },
        ].map((item) => (
          <Pressable key={item.path} onPress={() => void openWebUrl(item.path)}>
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
