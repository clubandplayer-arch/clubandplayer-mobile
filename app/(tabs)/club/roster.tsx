import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { fetchClubRoster, updateClubRoster, type ClubRosterItem } from "../../../src/lib/api";
import { theme } from "../../../src/theme";
import { getProfileDisplayName } from "../../../src/lib/profiles/getProfileDisplayName";
import CountryFlag from "../../../src/components/ui/CountryFlag";
import { getCountryDisplay } from "../../../src/lib/geo/countryDisplay";

function getApiErrorMessage(errorText: string | undefined, status: number): string {
  if (!errorText) return `Errore (${status})`;
  try {
    const parsed = JSON.parse(errorText) as { message?: string; error?: string };
    if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
  } catch {
    // noop
  }
  return errorText;
}

export default function ClubRosterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [items, setItems] = useState<ClubRosterItem[]>([]);

  const loadRoster = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    try {
      const response = await fetchClubRoster();
      if (!response.ok) {
        setItems([]);
        setError(getApiErrorMessage(response.errorText, response.status));
        return;
      }

      const roster = Array.isArray(response.data?.roster) ? response.data.roster : [];
      setItems(roster);
    } catch (e: any) {
      setItems([]);
      setError(e?.message ? String(e.message) : "Errore caricamento rosa");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRoster("initial");
  }, [loadRoster]);

  const onRemove = useCallback(
    async (item: ClubRosterItem) => {
      setRemovingId(item.playerProfileId);
      const response = await updateClubRoster({
        playerProfileId: item.playerProfileId,
        inRoster: false,
      });
      setRemovingId(null);

      if (!response.ok) {
        if (response.status === 400 || response.status === 409) {
          Alert.alert("Rosa", getApiErrorMessage(response.errorText, response.status));
          return;
        }
        Alert.alert("Rosa", "Operazione non riuscita");
        return;
      }

      await loadRoster("refresh");
    },
    [loadRoster],
  );

  const listHeader = useMemo(
    () => (
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 18 }}>Rosa</Text>
        <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
          Qui trovi i player in rosa. Puoi aggiungerli/rimuoverli dal toggle “In Rosa” nella pagina Seguiti.
        </Text>
        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      </View>
    ),
    [error],
  );

  const groupedItems = useMemo(() => {
    const byRole = new Map<string, ClubRosterItem[]>();
    for (const item of items) {
      const roleLabel = String(item.role ?? "").trim() || "Senza ruolo";
      const current = byRole.get(roleLabel) ?? [];
      current.push(item);
      byRole.set(roleLabel, current);
    }

    return Array.from(byRole.entries())
      .sort(([a], [b]) => a.localeCompare(b, "it"))
      .flatMap(([role, members]) => [
        { type: "header" as const, key: `header-${role}`, role, member: null },
        ...members.map((member) => ({
          type: "player" as const,
          key: member.playerProfileId,
          role,
          member,
        })),
      ]);
  }, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: 12 }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{ paddingBottom: 24 }}
          data={error ? [] : groupedItems}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={listHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadRoster("refresh")} />}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View style={{ marginHorizontal: 16, marginTop: 6, marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.muted, fontWeight: "800", textTransform: "uppercase", fontSize: 12 }}>
                    {item.role}
                  </Text>
                </View>
              );
            }

            const member = item.member;
            const subtitle = [member.role, member.sport].filter(Boolean).join(" • ");
            const busy = removingId === member.playerProfileId;
            const name = getProfileDisplayName({ ...member, account_type: "athlete" });
            const memberCountry = member as ClubRosterItem & { country?: string | null; countryText?: string | null };
            const country = getCountryDisplay(memberCountry.country ?? memberCountry.countryText ?? null);

            return (
              <Pressable
                onPress={() => {
                  router.push({ pathname: "/players/[id]", params: { id: member.playerProfileId } });
                }}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.neutral100,
                  borderRadius: 12,
                  padding: 12,
                  backgroundColor: theme.colors.background,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: theme.colors.neutral100 }}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 16 }}>{name}</Text>
                    {subtitle ? <Text style={{ marginTop: 4, color: theme.colors.muted }}>{subtitle}</Text> : null}
                    {country.label ? (
                      <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <CountryFlag iso2={country.iso2} />
                        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{country.label}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={(event) => {
                    event.stopPropagation();
                    void onRemove(member);
                  }}
                  style={{
                    marginTop: 10,
                    alignSelf: "flex-start",
                    borderWidth: 1,
                    borderColor: theme.colors.danger,
                    borderRadius: 999,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>{busy ? "Rimozione..." : "Rimuovi"}</Text>
                </Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <Text style={{ color: theme.colors.muted }}>Nessun giocatore in rosa</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
