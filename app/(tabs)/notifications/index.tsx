import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { fetchNotifications, postNotificationsMarkAllRead } from "../../../src/lib/api";
import { setNotificationsBadgeCount } from "../../../src/lib/notificationsBadge";
import { theme } from "../../../src/theme";
import { useRouter } from "expo-router";

type NotificationActor = {
  id?: string;
  display_name?: string | null;
  full_name?: string | null;
  public_name?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
};

type NotificationItem = {
  id: string;
  kind: string;
  payload: any;
  created_at: string;
  read?: boolean;
  read_at?: string | null;
  actor_profile_id?: string | null;
  actor?: NotificationActor | null;
};

function getActorName(notification: NotificationItem): string {
  return notification.actor?.display_name || notification.actor?.full_name || notification.actor?.public_name || "Utente";
}

function getNotificationMessage(kind: string): string {
  switch (kind) {
    case "new_comment":
      return "ha commentato un post";
    case "new_reaction":
      return "ha reagito a un post";
    case "new_reaction": // (no, non duplicare: una sola volta)
      return "ha reagito a un post";
    case "follow":
      return "ha iniziato a seguirti";
    case "application_status_changed":
      return "ha aggiornato una candidatura";
    case "application_received":
      return "nuova candidatura ricevuta";
    case "new_application_received":
      return "nuova candidatura ricevuta";
    case "message":
      return "ti ha scritto un messaggio";
    default:
      return "nuova notifica";
  }
}

function getInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  return trimmed.charAt(0).toUpperCase();
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (!avatarUrl) {
    return (
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: theme.colors.neutral200,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{getInitial(name)}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: avatarUrl }}
      style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.neutral200 }}
    />
  );
}

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const router = useRouter();

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read: true,
        read_at: item.read_at ?? new Date().toISOString(),
      }))
    );
    setNotificationsBadgeCount(0);
    await postNotificationsMarkAllRead();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

    // IMPORTANT: all=1 per ottenere la lista completa (coerente col web che ha filtro unread separato)
    const res = await fetchNotifications({ limit: 50 });

    console.log("[notifications][fetch]", {
      ok: res.ok,
      status: res.status,
      errorText: res.errorText ?? null,
      items: res.data?.data?.length ?? 0,
    });

    const kinds = (res.data?.data ?? []).map((n: any) => n.kind);
    console.log("[notifications][kinds]", kinds);

    console.log("[notifications][raw-data]", JSON.stringify(res.data, null, 2));

    if (!res.ok) {
      setNotifications([]);
      setErrorText(res.errorText || `Errore caricamento notifiche (HTTP ${res.status})`);
      setLoading(false);
      return;
    }

    const nextNotifications = (res.data?.data as NotificationItem[]) ?? [];
    setNotifications(nextNotifications);

    const hasUnread = nextNotifications.some((item) => item.read_at == null && item.read !== true);
    if (hasUnread) {
      await markAllAsRead();
    }

    setLoading(false);
  }, [markAllAsRead]);

  // Refetch quando la screen torna in focus (es: dopo login o dopo navigazioni)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!active) return;
        await load();
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (errorText) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 8 }}>Errore</Text>
        <Text style={{ color: theme.colors.text, marginBottom: 12 }}>{errorText}</Text>

        <Pressable
          onPress={() => void load()}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  if (!notifications.length) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 8 }}>Notifiche</Text>
        <Text style={{ color: theme.colors.text }}>Nessuna notifica da mostrare.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const name = getActorName(item);
        const unread = item.read_at == null && item.read !== true;

        return (
          <Pressable
            onPress={() => {
              void markAllAsRead();

              const p: any = item.payload ?? {};

              if (item.kind === "message" && typeof p.thread_id === "string") {
                router.push(`/messages/${p.thread_id}`);
                return;
              }

              if ((item.kind === "new_comment" || item.kind === "new_reaction") && typeof p.post_id === "string") {
                router.push(`/posts/${p.post_id}`);
                return;
              }

              console.log("TODO PR-N2 deep link", item.id, item.kind);
            }}
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.neutral200,
              backgroundColor: unread ? theme.colors.neutral100 : "transparent",
            }}
          >
            <Avatar name={name} avatarUrl={item.actor?.avatar_url} />

            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: unread ? "600" : "500" }}>{name}</Text>
              <Text style={{ color: theme.colors.text, marginTop: 2 }}>
                {getNotificationMessage(item.kind)}
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 6, fontSize: 12 }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>

            {unread ? (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: theme.colors.primary,
                  marginTop: 4,
                }}
              />
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}
