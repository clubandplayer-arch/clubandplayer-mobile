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
import { useRouter } from "expo-router";

import { fetchDirectMessageThreads } from "../../../src/lib/api";
import type { DirectThreadSummary } from "../../../src/types/directMessages";

function formatWhen(value?: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

function normalizeThread(raw: DirectThreadSummary): DirectThreadSummary {
  const other = raw.other ?? null;
  return {
    ...raw,
    otherProfileId: raw.otherProfileId || raw.other_profile_id || other?.id || "",
    otherFullName: raw.otherFullName ?? raw.other_full_name ?? other?.full_name,
    otherDisplayName: raw.otherDisplayName ?? raw.other_display_name ?? other?.display_name,
    otherAvatarUrl: raw.otherAvatarUrl ?? raw.other_avatar_url ?? other?.avatar_url,
    hasUnread: raw.hasUnread ?? raw.has_unread ?? false,
    lastMessage: raw.lastMessage ?? raw.last_message,
    lastMessageAt: raw.lastMessageAt ?? raw.last_message_at,
  };
}

function Avatar({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "#e5e7eb",
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#e5e7eb",
      }}
    />
  );
}

export default function MessagesInboxScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<DirectThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetchDirectMessageThreads();

    if (!response.ok || !response.data) {
      setThreads([]);
      setError(response.errorText || "Impossibile caricare i messaggi");
      return;
    }

    const items = Array.isArray(response.data.threads) ? response.data.threads.map(normalizeThread) : [];
    setThreads(items.filter((item) => !!item.otherProfileId));
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await load();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: DirectThreadSummary }) => {
      const displayName = item.otherFullName || item.otherDisplayName || "Profilo";
      return (
        <Pressable
          onPress={() => router.push(`/messages/${encodeURIComponent(item.otherProfileId)}` as never)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
            backgroundColor: "#fff",
          }}
        >
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar url={item.otherAvatarUrl} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 }}>
                  {displayName}
                </Text>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>{formatWhen(item.lastMessageAt)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text numberOfLines={1} style={{ color: "#4b5563", flex: 1 }}>
                  {item.lastMessage || ""}
                </Text>
                {item.hasUnread ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#2563eb",
                    }}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [router],
  );

  const header = useMemo(
    () => (
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", gap: 6 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827" }}>Messaggi</Text>
        {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}
      </View>
    ),
    [error],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={threads}
      keyExtractor={(item) => item.otherProfileId}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={{ padding: 20 }}>
          <Text style={{ color: "#6b7280" }}>Nessun thread disponibile.</Text>
        </View>
      }
    />
  );
}
