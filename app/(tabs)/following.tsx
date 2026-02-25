import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SectionList,
  Image,
  Pressable,
  RefreshControl,
  Switch,
  Text,
  View,
} from "react-native";

import { fetchClubRoster, fetchFollowingList, updateClubRoster, useWebSession } from "../../src/lib/api";
import { supabase } from "../../src/lib/supabase";
import { useIsClub } from "../../src/lib/useIsClub";
import { theme } from "../../src/theme";

type FollowingItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  accountType: "club" | "athlete" | "unknown";
};

type DecoratedFollowingItem = FollowingItem & {
  isInRoster: boolean;
};

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function sanitizeName(value: string | null): string | null {
  if (!value) return null;
  return value.includes("@") ? null : value;
}

function normalizeAccountType(value: unknown): "club" | "athlete" | "unknown" {
  if (value === "club") return "club";
  if (value === "athlete") return "athlete";
  return "unknown";
}

function normalizeFollowingItem(raw: unknown): FollowingItem | null {
  const item = (raw ?? {}) as Record<string, unknown>;

  const id = typeof item.id === "string" ? item.id.trim() : "";
  const accountTypeRaw = typeof item.account_type === "string" ? item.account_type.trim() : "";

  if (!id || !accountTypeRaw) {
    if (__DEV__) {
      console.log("[following] dropped item: missing profile id", {
        itemKeys: Object.keys(item),
      });
    }
    return null;
  }

  const accountType = normalizeAccountType(accountTypeRaw);

  const name =
    sanitizeName(pickString(item, ["name"])) ??
    sanitizeName(pickString(item, ["display_name"])) ??
    sanitizeName(pickString(item, ["full_name"])) ??
    "Profilo";

  const avatarUrl = pickString(item, ["avatar_url", "avatarUrl"]);

  return {
    id,
    name,
    avatarUrl,
    accountType,
  };
}

function resolveItemsPayload(responseData: unknown, responseRoot: unknown): unknown[] | null {
  if (Array.isArray((responseData as { items?: unknown[] } | null)?.items)) {
    return (responseData as { items: unknown[] }).items;
  }

  if (Array.isArray(responseData)) return responseData;

  if (Array.isArray((responseRoot as { items?: unknown[] } | null)?.items)) {
    return (responseRoot as { items: unknown[] }).items;
  }

  return null;
}

function Avatar({ uri }: { uri: string | null }) {
  if (!uri) {
    return (
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: theme.colors.neutral200,
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.neutral200,
      }}
    />
  );
}

function parseErrorCode(errorText?: string): string | null {
  if (!errorText) return null;
  try {
    const parsed = JSON.parse(errorText) as { code?: unknown };
    return typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

export default function FollowingScreen() {
  const web = useWebSession();
  const [sessionPresent, setSessionPresent] = useState(false);
  const { isClub, loading: isClubLoading } = useIsClub(sessionPresent);
  const [rosterSet, setRosterSet] = useState<Set<string>>(new Set());
  const [pendingRosterIds, setPendingRosterIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FollowingItem[]>([]);

  const PINK_SOFT = "#F7D6E6";
  const PINK = "#E91E63";

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionPresent(Boolean(data.session?.user?.id));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionPresent(Boolean(session?.user?.id));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadRoster = useCallback(async () => {
    const response = await fetchClubRoster();
    if (!response.ok || !response.data) {
      setRosterSet(new Set());
      return;
    }

    const nextRosterSet = new Set(
      response.data.roster
        .map((row) => String(row.playerProfileId ?? "").trim())
        .filter(Boolean),
    );

    if (__DEV__) {
      console.log("[following][club] rosterSet size", nextRosterSet.size);
    }

    setRosterSet(nextRosterSet);
  }, []);

  useEffect(() => {
    if (!web.ready) return;
    if (isClubLoading) return;

    if (!isClub) {
      setRosterSet(new Set());
      return;
    }

    void loadRoster();
  }, [isClub, isClubLoading, loadRoster, web.ready]);

  const load = useCallback(async () => {
    if (!web.ready) return;

    const response = await fetchFollowingList();

    if (!response.ok) {
      setItems([]);
      setError(`Errore caricamento seguiti (${response.status})`);
      setLoading(false);
      return;
    }

    const rawItems = resolveItemsPayload(response.data, response as unknown);

    if (!rawItems) {
      setItems([]);
      setError("Risposta inattesa dal server");
      setLoading(false);
      return;
    }

    setItems(rawItems.map(normalizeFollowingItem).filter((item): item is FollowingItem => item !== null));
    setError(null);
    setLoading(false);
  }, [web.ready]);

  useEffect(() => {
    if (!web.ready) {
      if (web.error) {
        setLoading(false);
        setError("Sessione web non disponibile");
      }
      return;
    }

    setLoading(true);
    load();
  }, [load, web.error, web.ready]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), isClub && !isClubLoading ? loadRoster() : Promise.resolve()]);
    } finally {
      setRefreshing(false);
    }
  }, [isClub, isClubLoading, load, loadRoster]);

  const decoratedItems = useMemo<DecoratedFollowingItem[]>(() => {
    const next = items.map((item) => ({
      ...item,
      isInRoster: isClub ? rosterSet.has(item.id) : false,
    }));

    if (__DEV__ && isClub) {
      const marked = next.filter((item) => item.isInRoster).length;
      console.log("[following][club] marked in roster", { marked, total: next.length });
    }

    return next;
  }, [isClub, items, rosterSet]);

  const onToggleRoster = useCallback(
    async (item: DecoratedFollowingItem, nextInRoster: boolean) => {
      if (!isClub) return;
      if (item.accountType !== "athlete") return;
      if (pendingRosterIds.has(item.id)) return;

      const wasInRoster = rosterSet.has(item.id);

      setPendingRosterIds((prev) => new Set(prev).add(item.id));

      setRosterSet((prev) => {
        const next = new Set(prev);
        if (nextInRoster) next.add(item.id);
        else next.delete(item.id);
        return next;
      });

      try {
        const response = await updateClubRoster({
          playerProfileId: item.id,
          inRoster: nextInRoster,
        });

        if (!response.ok) {
          setRosterSet((prev) => {
            const next = new Set(prev);
            if (wasInRoster) next.add(item.id);
            else next.delete(item.id);
            return next;
          });

          const errorCode = parseErrorCode(response.errorText);

          if (response.status === 400) {
            Alert.alert("Devi seguire il player prima");
          } else if (
            response.status === 409 &&
            (errorCode === "PLAYER_ALREADY_IN_ROSTER_SPORT" || errorCode === "PLAYER_ALREADY_IN_ROSTER")
          ) {
            Alert.alert("Player già in rosa di un altro club per questo sport. Deve essere rimosso prima.");
          } else {
            Alert.alert("Errore", "Operazione non riuscita. Riprova.");
          }

          if (__DEV__) {
            console.log("[following][club] toggle error", {
              status: response.status,
              errorCode,
              playerProfileId: item.id,
              inRoster: nextInRoster,
            });
          }
        } else {
          try {
            await loadRoster();
          } catch (error) {
            if (__DEV__) {
              console.log("[following][club] loadRoster after toggle failed", {
                playerProfileId: item.id,
                inRoster: nextInRoster,
                error: String(error),
              });
            }
          }
        }
      } finally {
        setPendingRosterIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [isClub, loadRoster, pendingRosterIds, rosterSet],
  );

  const sections = useMemo(() => {
    const clubItems = decoratedItems.filter((item) => item.accountType === "club");
    const playerItems = decoratedItems.filter((item) => item.accountType === "athlete");
    const unknownItems = decoratedItems.filter((item) => item.accountType === "unknown");

    const next: Array<{ title: string; data: DecoratedFollowingItem[] }> = [
      { title: "Club che segui", data: clubItems },
      { title: "Player che segui", data: playerItems },
    ];

    if (unknownItems.length > 0) next.push({ title: "Altri", data: unknownItems });

    return next;
  }, [decoratedItems]);

  const empty = useMemo(
    () => !loading && !error && decoratedItems.length === 0,
    [decoratedItems.length, error, loading],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: theme.colors.muted }}>Caricamento seguiti…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{error}</Text>
          <Pressable onPress={load} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Riprova</Text>
          </Pressable>
        </View>
      ) : empty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.text }}>Seguiti</Text>
          <Text style={{ color: theme.colors.muted, textAlign: "center" }}>Non stai seguendo nessun profilo.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 10 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: theme.colors.text,
                marginTop: 8,
                marginBottom: 8,
              }}
            >
              {section.title}
            </Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const pending = pendingRosterIds.has(item.id);

            return (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.neutral200,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: theme.colors.background,
                }}
              >
                <Avatar uri={item.avatarUrl} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.text }}>{item.name}</Text>
                </View>
                {isClub && item.accountType === "athlete" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderWidth: 1,
                      borderColor: PINK,
                      backgroundColor: PINK_SOFT,
                      borderRadius: 999,
                      paddingLeft: 10,
                      paddingRight: 6,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: PINK, fontWeight: "700", fontSize: 12 }}>In Rosa</Text>
                    <Switch
                      value={item.isInRoster}
                      disabled={pending}
                      thumbColor={item.isInRoster ? PINK : "#FFFFFF"}
                      trackColor={{
                        false: (theme.colors as any).neutral300 ?? theme.colors.neutral200,
                        true: PINK_SOFT,
                      }}
                      onValueChange={(nextValue) => {
                        void onToggleRoster(item, nextValue);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
