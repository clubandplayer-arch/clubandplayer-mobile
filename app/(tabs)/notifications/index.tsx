import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchNotifications, postNotificationsMarkAllRead } from "../../../src/lib/api";
import { setNotificationsBadgeCount } from "../../../src/lib/notificationsBadge";
import { theme } from "../../../src/theme";

type NotificationItem = {
  id: string | number;
  kind: string;
  payload: any;
  created_at: string;
  read: boolean;
  actor?: {
    id: string;
    account_type: string;
    avatar_url?: string | null;
    public_name?: string | null;
    display_name?: string | null;
    full_name?: string | null;
  };
};

function isEmailLike(value?: string | null) {
  return !!value && value.includes("@");
}

function getActorName(item: NotificationItem): string {
  // NOTIFICHE: il backend manda public_name come primario
  if (item.actor?.public_name) return item.actor.public_name;

  const fullName = item.actor?.full_name;
  if (fullName) return fullName;

  const displayName = item.actor?.display_name;
  if (displayName && !isEmailLike(displayName)) return displayName;

  return "Utente";
}

function getNotificationMessage(item: NotificationItem): string {
  switch (item.kind) {
    case "message":
      return "ti ha scritto un messaggio";

    case "new_comment":
      return "ha commentato un post";

    case "new_reaction":
      return "ha reagito a un post";

    case "application_status":
      if (item.payload?.status === "accepted") {
        return `ha accettato la tua candidatura`;
      }
      return `ha aggiornato lo stato della candidatura`;

    default:
      return "Nuova notifica";
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const markingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);

    const res = await fetchNotifications();
    if (res.ok && Array.isArray(res.data)) {
      setNotifications(res.data);

      const unreadCount = res.data.filter((n) => !n.read).length;

      if (unreadCount > 0 && !markingRef.current) {
        markingRef.current = true;

        await postNotificationsMarkAllRead();

        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            read: true,
          }))
        );

        setNotificationsBadgeCount(0);
        markingRef.current = false;
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = async (item: NotificationItem) => {
    if (!item.read && !markingRef.current) {
      markingRef.current = true;
      await postNotificationsMarkAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
        }))
      );
      setNotificationsBadgeCount(0);
      markingRef.current = false;
    }

    if (item.kind === "new_comment" || item.kind === "new_reaction") {
      if (item.payload?.post_id) {
        router.push(`/posts/${item.payload.post_id}`);
      }
    }

    if (item.kind === "message") {
      if (item.payload?.thread_id) {
        router.push(`/messages/${item.payload.thread_id}`);
      }
    }

    if (item.kind === "application_status") {
      if (item.payload?.opportunity_id) {
        router.push(`/opportunities/${item.payload.opportunity_id}`);
      }
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => {
        const name = getActorName(item);
        const message = getNotificationMessage(item);

        return (
          <Pressable
            onPress={() => handlePress(item)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.neutral200,
              backgroundColor: theme.colors.background,
            }}
          >
            {item.actor?.avatar_url ? (
              <Image
                source={{ uri: item.actor.avatar_url }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.colors.neutral200,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "800", color: theme.colors.text }}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: theme.colors.text }}>
                {name}
              </Text>
              <Text style={{ color: theme.colors.muted }}>{message}</Text>
            </View>

            {!item.read ? (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: theme.colors.primary,
                }}
              />
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}