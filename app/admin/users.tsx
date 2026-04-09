import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { fetchAdminUsers, type AdminUserRow, updateAdminUserStatus, useWebSession, useWhoami } from "../../src/lib/api";
import { theme } from "../../src/theme";

function getUserTitle(row: AdminUserRow) {
  const fullName = row.full_name?.trim();
  const display = row.display_name?.trim();
  const email = row.auth_email?.trim() || row.email?.trim();
  return fullName || display || email || "Utente senza nome";
}

function getUserSubtitle(row: AdminUserRow) {
  return row.auth_email || row.email || row.user_id || row.id;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isAdmin = useMemo(() => Boolean(whoami.data?.admin), [whoami.data?.admin]);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminUsers("pending");
    if (!res.ok) {
      setRows([]);
      setError(res.errorText ?? "Errore nel caricamento utenti pending");
      setLoading(false);
      return;
    }
    setRows((res.data?.data ?? []).slice());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!web.ready || !isAdmin) return;
    void loadPending();
  }, [isAdmin, loadPending, web.ready]);

  const handleUpdateStatus = async (userId: string, status: "active" | "rejected") => {
    setSavingId(userId);
    setError(null);
    const res = await updateAdminUserStatus(userId, status);
    if (!res.ok) {
      setError(res.errorText ?? "Errore durante aggiornamento stato");
      setSavingId(null);
      return;
    }
    await loadPending();
    setSavingId(null);
  };

  if (web.loading || whoami.loading || (!web.error && !whoami.error && !whoami.data)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (web.error || whoami.error || !isAdmin) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>Accesso riservato admin</Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
          Questa schermata è disponibile solo per utenti admin.
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/feed")}
          style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Vai al feed</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: theme.colors.text }}>Admin · Approva utenti</Text>
      <Text style={{ marginTop: 4, color: theme.colors.muted }}>
        Lista utenti pending. Azioni disponibili: Approva / Rifiuta.
      </Text>

      {error ? (
        <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, gap: 8 }}>
          <Text style={{ color: "#b91c1c", fontWeight: "600" }}>{error}</Text>
          <Pressable
            onPress={() => void loadPending()}
            style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: "#ef4444", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
          >
            <Text style={{ color: "#b91c1c", fontWeight: "600" }}>Riprova</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : rows.length === 0 ? (
        <View style={{ marginTop: 16, borderWidth: 1, borderColor: theme.colors.neutral200, backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
          <Text style={{ color: theme.colors.muted }}>Nessun utente pending da approvare.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.user_id ?? item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 10 }}
          renderItem={({ item }) => {
            const rowId = item.user_id;
            const isSaving = rowId ? savingId === rowId : false;
            return (
              <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, backgroundColor: "#fff", padding: 12, gap: 8 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{getUserTitle(item)}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{getUserSubtitle(item)}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Stato: {item.status ?? "pending"}</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    disabled={!rowId || isSaving}
                    onPress={() => rowId && void handleUpdateStatus(rowId, "active")}
                    style={{ backgroundColor: "#059669", opacity: !rowId || isSaving ? 0.6 : 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Approva</Text>
                  </Pressable>
                  <Pressable
                    disabled={!rowId || isSaving}
                    onPress={() => rowId && void handleUpdateStatus(rowId, "rejected")}
                    style={{ backgroundColor: "#dc2626", opacity: !rowId || isSaving ? 0.6 : 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Rifiuta</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
