import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useWebSession,
  useWhoami,
} from "../../../src/lib/api";
import { emit } from "../../../src/lib/events/appEvents";
import { devWarn } from "../../../src/lib/debug/devLog";
import { setNotificationsBadgeCount } from "../../../src/lib/notificationsBadge";
import type { NotificationWithActor } from "../../../src/types/notifications";
import { theme } from "../../../src/theme";

type FilterMode = "all" | "unread";

function normalizeRole(role: unknown): string {
  return String(role ?? "").toLowerCase().trim();
}

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
    case "application_received":
      return "Nuova candidatura ricevuta";
    default:
      return "Hai ricevuto una nuova notifica";
  }
}

function buildNotificationPreview(notification: NotificationWithActor): string | null {
  const payloadPreview = payloadValue(notification.payload, "preview");
  if (payloadPreview) return payloadPreview;

  if (notification.kind === "application_received") {
    const actorName = notification.actor?.public_name ?? "Un player";
    const opportunityTitle =
      payloadValue(notification.payload, "opportunity_title") ||
      payloadValue(notification.payload, "title");

    if (opportunityTitle) return `${actorName} si è candidato a ${opportunityTitle}`;
    return `${actorName} si è candidato a una tua opportunità`;
  }

  return null;
}

function resolveNotificationHref(notification: NotificationWithActor): string {
  const payload = notification.payload;
  const kind = notification.kind;

  if (kind === "new_message" || kind === "message") {
    const senderId =
      payloadValue(payload, "sender_profile_id") ||
      (notification.actor_profile_id ? notification.actor_profile_id : null);
    if (senderId) return `/messages/${encodeURIComponent(senderId)}`;
    return "/messages";
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
  const localReadIdsRef = useRef<Set<string>>(new Set());
  const web = useWebSession();
  const whoami = useWhoami(web.ready);

  const updateItemsWithBadge = useCallback((nextItems: NotificationWithActor[]) => {
    setItems(nextItems);
    setNotificationsBadgeCount(nextItems.filter((notification) => !notification.read_at).length);
  }, []);

  const load = useCallback(async (mode: FilterMode) => {
    setError(null);

    const response = await fetchNotifications({
      limit: 50,
      page: 1,
      all: 1,
      unread: mode === "unread",
    });

    if (!response.ok || !response.data) {
      updateItemsWithBadge([]);
      setError(response.errorText || "Errore nel caricamento notifiche");
      return;
    }

    const serverItems = Array.isArray(response.data.data) ? response.data.data : [];
    const mergedItems = serverItems.map((notification) => {
      const shouldForceRead = localReadIdsRef.current.has(notification.id) && !notification.read_at;
      if (!shouldForceRead) return notification;
      return { ...notification, read_at: new Date().toISOString(), read: true };
    });

    updateItemsWithBadge(mergedItems);
  }, [updateItemsWithBadge]);

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

      const readAt = new Date().toISOString();
      const markedItems = items.map((item) => ({ ...item, read_at: readAt, read: true }));
      localReadIdsRef.current = new Set(markedItems.map((item) => item.id));
      updateItemsWithBadge(markedItems);
      emit("app:notifications-updated");
      await load(filter);
    } finally {
      setUpdatingAll(false);
    }
  }, [filter, items, load, updateItemsWithBadge]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationWithActor }) => {
      const preview = buildNotificationPreview(item);
      const isUnread = !item.read_at;

      return (
        <Pressable
          onPress={async () => {
            const role = normalizeRole((whoami.data as { role?: unknown } | null)?.role);
            const opportunityId = payloadValue(item.payload, "opportunity_id");
            const href =
              item.kind === "application_received"
                ? role === "club"
                  ? opportunityId
                    ? { pathname: "/club/applications", params: { opportunity_id: opportunityId } }
                    : "/club/applications"
                  : "/applications"
                : resolveNotificationHref(item) || "/notifications";

            if (isUnread) {
              const readAt = new Date().toISOString();
              localReadIdsRef.current.add(item.id);
              setItems((prev) => {
                const nextItems = prev.map((current) =>
                  current.id === item.id
                    ? { ...current, read_at: readAt, read: true }
                    : current,
                );
                setNotificationsBadgeCount(nextItems.filter((notification) => !notification.read_at).length);
                return nextItems;
              });

              const response = await patchNotificationsMarkRead({ ids: [item.id] });
              if (response.ok && (response.data?.updated ?? 0) > 0) {
                emit("app:notifications-updated");
              } else {
                devWarn("[notifications] mark-as-read failed", {
                  id: item.id,
                  status: response.status,
                  errorText: response.errorText,
                });
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
                      backgroundColor: theme.colors.primary,
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
    [router, whoami.data],
  );

  const header = useMemo(
    () => (
      <View style={{ padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <Text style={{ fontSize: 28, fontFamily: "Righteous", color: theme.colors.primary }}>Notifiche</Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setFilter("all")}
            style={{
              borderWidth: 1,
              borderColor: filter === "all" ? theme.colors.primary : theme.colors.neutral200,
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: filter === "all" ? theme.colors.primary : "#ffffff",
            }}
          >
            <Text style={{ color: filter === "all" ? "#ffffff" : theme.colors.text, fontWeight: "700" }}>
              Tutte
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter("unread")}
            style={{
              borderWidth: 1,
              borderColor: filter === "unread" ? theme.colors.primary : theme.colors.neutral200,
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: filter === "unread" ? theme.colors.primary : "#ffffff",
            }}
          >
            <Text style={{ color: filter === "unread" ? "#ffffff" : theme.colors.text, fontWeight: "700" }}>
              Da leggere
            </Text>
          </Pressable>

          <Pressable
            onPress={onMarkAllRead}
            disabled={updatingAll}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 14,
              opacity: updatingAll ? 0.5 : 1,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Segna tutte come lette</Text>
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
