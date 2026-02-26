import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";

import { getNotifications, type NotificationItem } from "../../../src/lib/api";
import { theme } from "../../../src/theme";

function getActorName(notification: NotificationItem): string {
  return notification.actor?.display_name || notification.actor?.full_name || "Utente";
}

function getNotificationMessage(kind: string): string {
  switch (kind) {
    case "new_comment":
      return "ha commentato un post";
    case "new_reaction":
      return "ha reagito a un post";
    case "follow":
      return "ha iniziato a seguirti";
    case "application_status_changed":
      return "ha aggiornato una candidatura";
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

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const items = await getNotifications();
      if (mounted) {
        setNotifications(items);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const actorName = getActorName(item);
        const isUnread = item.read_at == null && item.read !== true;

        return (
          <Pressable
            onPress={() => console.log("TODO PR-N2 deep link", item.id)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.neutral100,
              backgroundColor: theme.colors.background,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar name={actorName} avatarUrl={item.actor?.avatar_url} />

              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: isUnread ? "600" : "500", flex: 1 }}>
                    {actorName} {getNotificationMessage(item.kind)}
                  </Text>
                  {isUnread ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.primary,
                      }}
                    />
                  ) : null}
                </View>

                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
          <Text style={{ color: theme.colors.muted }}>Nessuna notifica disponibile.</Text>
        </View>
      }
    />
  );
}
