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

import {
  fetchNotifications,
  patchNotificationsMarkRead,
  postNotificationsMarkAllRead,
} from "../../../src/lib/api";
import { emit } from "../../../src/lib/events/appEvents";
import type { NotificationWithActor } from "../../../src/types/notifications";

type FilterMode = "all" | "unread";

function formatWhen(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function payloadValue(payload: Record<string, unknown> | null | undefined, key: string): string | null {
  const raw = payload?.[key];
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value || null;
}

function buildNotificationText(notification: NotificationWithActor): string {
  const actorName = notification.actor?.public_name || "Qualcuno";
  switch (notification.kind) {
    case "new_message":
    case "message":
      return `${actorName} ti ha inviato un messaggio`;
    case "new_follower":
      return `${actorName} ha iniziato a seguirti`;
    case "new_opportunity":
      return "Nuova opportunità disponibile";
    case "application_status":
      return "Aggiornamento sullo stato candidatura";
    default:
      return "Hai ricevuto una nuova notifica";
  }
}

function resolveNotificationHref(notification: NotificationWithActor): string {
  const payload = notification.payload;
  const kind = notification.kind;

  if (kind === "new_message" || kind === "message") {
    const conversationId = payloadValue(payload, "conversation_id");
    if (conversationId) return `/messages?conversationId=${encodeURIComponent(conversationId)}`;

    const senderId =
      payloadValue(payload, "sender_profile_id") ||
      (notification.actor_profile_id ? notification.actor_profile_id : null);
    if (senderId) return `/messages/${encodeURIComponent(senderId)}`;
  }

  if (kind === "new_follower") {
    const followerId = payloadValue(payload, "follower_profile_id");
    if (followerId) return `/profiles/${encodeURIComponent(followerId)}`;
  }

  if (kind === "new_opportunity" || kind === "application_status") {
    const opportunityId = payloadValue(payload, "opportunity_id");
    if (opportunityId) return `/opportunities/${encodeURIComponent(opportunityId)}`;
  }

  return "/notifications";
}

function Avatar({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: "#e5e7eb",
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#e5e7eb",
      }}
    />
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: FilterMode) => {
    setError(null);

    const response = await fetchNotifications({
      limit: 50,
      page: 1,
      all: 1,
      unread: mode === "unread",
    });

    if (!response.ok || !response.data) {
      setItems([]);
      setError(response.errorText || "Errore nel caricamento notifiche");
      return;
    }

    setItems(Array.isArray(response.data.data) ? response.data.data : []);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await load(filter);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [filter, load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load(filter);
    } finally {
      setRefreshing(false);
    }
  }, [filter, load]);

  const onMarkAllRead = useCallback(async () => {
    try {
      setUpdatingAll(true);
      const response = await postNotificationsMarkAllRead();
      if (!response.ok) {
        setError(response.errorText || "Impossibile segnare tutte come lette");
        return;
      }

      emit("app:notifications-updated");
      await load(filter);
    } finally {
      setUpdatingAll(false);
    }
  }, [filter, load]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationWithActor }) => {
      const preview = payloadValue(item.payload, "preview");
      const isUnread = !item.read_at;

      return (
        <Pressable
          onPress={async () => {
            const href = resolveNotificationHref(item);
            if (isUnread) {
              const response = await patchNotificationsMarkRead({ ids: [item.id] });
              if (response.ok && (response.data?.updated ?? 0) > 0) {
                emit("app:notifications-updated");
                setItems((prev) =>
                  prev.map((current) =>
                    current.id === item.id
                      ? { ...current, read_at: new Date().toISOString(), read: true }
                      : current,
                  ),
                );
              } else {
                setError("Impossibile segnare come letta");
              }
            }
            router.push(href as never);
          }}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#ffffff",
            gap: 4,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar url={item.actor?.avatar_url ?? null} />

            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 }}>
                  {buildNotificationText(item)}
                </Text>
                {isUnread ? (
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      marginTop: 4,
                      backgroundColor: "#2563eb",
                    }}
                  />
                ) : null}
              </View>

              {preview ? <Text style={{ color: "#4b5563" }}>{preview}</Text> : null}
              <Text style={{ fontSize: 12, color: "#6b7280" }}>{formatWhen(item.created_at)}</Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [router],
  );

  const header = useMemo(
    () => (
      <View style={{ padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827" }}>Notifiche</Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setFilter("all")}
            style={{
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: filter === "all" ? "#111827" : "#ffffff",
            }}
          >
            <Text style={{ color: filter === "all" ? "#ffffff" : "#111827", fontWeight: "700" }}>All</Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter("unread")}
            style={{
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: filter === "unread" ? "#111827" : "#ffffff",
            }}
          >
            <Text style={{ color: filter === "unread" ? "#ffffff" : "#111827", fontWeight: "700" }}>
              Unread
            </Text>
          </Pressable>

          <Pressable
            onPress={onMarkAllRead}
            disabled={updatingAll}
            style={{
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 14,
              opacity: updatingAll ? 0.5 : 1,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "700" }}>Segna tutte come lette</Text>
          </Pressable>
        </View>

        {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}
      </View>
    ),
    [error, filter, onMarkAllRead, updatingAll],
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
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={{ padding: 20 }}>
          <Text style={{ color: "#6b7280" }}>Nessuna notifica disponibile.</Text>
        </View>
      }
    />
  );
}
