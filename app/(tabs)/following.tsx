import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import BrandHeader from "../../src/components/brand/BrandHeader";
import { fetchClubRoster, fetchFollowingList, useWebSession } from "../../src/lib/api";
import { supabase } from "../../src/lib/supabase";
import { useIsClub } from "../../src/lib/useIsClub";
import { theme } from "../../src/theme";

type FollowingItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
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

function normalizeFollowingItem(raw: unknown): FollowingItem | null {
  const item = (raw ?? {}) as Record<string, unknown>;
  const profile = (item.profile ?? item.target_profile ?? {}) as Record<string, unknown>;

  const id =
    pickString(item, ["target_profile_id", "profile_id", "id"]) ??
    pickString(profile, ["id", "profile_id"]);

  if (!id) {
    if (__DEV__) {
      console.log("[following] dropped item: missing profile id", {
        itemKeys: Object.keys(item),
        profileKeys: Object.keys(profile),
      });
    }
    return null;
  }

  const name =
    pickString(item, ["display_name", "full_name", "name", "title"]) ??
    pickString(profile, ["display_name", "full_name", "name", "title"]) ??
    "Profilo";

  const avatarUrl =
    pickString(item, ["avatar_url", "avatarUrl", "image_url", "imageUrl"]) ??
    pickString(profile, ["avatar_url", "avatarUrl", "image_url", "imageUrl"]);

  return {
    id,
    name,
    avatarUrl,
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

export default function FollowingScreen() {
  const web = useWebSession();
  const [sessionPresent, setSessionPresent] = useState(false);
  const { isClub, loading: isClubLoading } = useIsClub(sessionPresent);
  const [rosterSet, setRosterSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FollowingItem[]>([]);

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
      await Promise.all([load(), isClub ? loadRoster() : Promise.resolve()]);
    } finally {
      setRefreshing(false);
    }
  }, [isClub, load, loadRoster]);

  const decoratedItems = useMemo(() => {
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

  const empty = useMemo(
    () => !loading && !error && decoratedItems.length === 0,
    [decoratedItems.length, error, loading],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BrandHeader subtitle="Seguiti" />

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
          <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.text }}>Seguiti (placeholder)</Text>
          <Text style={{ color: theme.colors.muted, textAlign: "center" }}>Non stai seguendo nessun profilo.</Text>
        </View>
      ) : (
        <FlatList
          data={decoratedItems}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
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
                {isClub ? (
                  <Text style={{ color: theme.colors.muted }}>
                    {item.isInRoster ? "In Rosa" : "Fuori Rosa"}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
