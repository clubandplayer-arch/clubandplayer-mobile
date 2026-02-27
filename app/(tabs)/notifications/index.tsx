import { useCallback, useRef, useState } from "react";
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
  id: string | number;
  kind: string;
  payload: any;
  created_at: string;
  read?: boolean;
  read_at?: string | null;
  actor_profile_id?: string | null;
  actor?: NotificationActor | null;
};

function isEmailLike(v?: string | null) {
  return !!v && v.includes("@");
}

// ✅ Notifiche: preferiamo public_name (come da log server), poi full_name, poi display_name (non email)
function getActorName(notification: NotificationItem): string {
  const a = notification.actor;
  if (a?.public_name) return a.public_name;
  if (a?.full_name) return a.full_name;
  if (a?.display_name && !isEmailLike(a.display_name)) return a.display_name;
  return "Utente";
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

  // ✅ evita chiamate ripetute a mark-all
  const markAllInFlightRef = useRef(false);

  const markAllAsReadOptimistic = useCallback(async () => {
    if (markAllInFlightRef.current) return;

    const hasUnread = notifications.some((n) => n.read_at == null && n.read !== true);
    if (!hasUnread) {
      // se non ci sono unread, allineiamo comunque badge a 0 (non fa male)
      setNotificationsBadgeCount(0);
      return;
    }

    markAllInFlightRef.current = true;

    try {
      await postNotificationsMarkAllRead();

      const nowIso = new Date().toISOString();

      // update ottimistico: NON rifetch, non toccare ordine, non svuotare nulla
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          read_at: n.read_at ?? nowIso,
        }))
      );

      setNotificationsBadgeCount(0);
    } finally {
      markAllInFlightRef.current = false;
    }
  }, [notifications]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

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

    const items = ((res.data?.data as NotificationItem[]) ?? []).map((n) => ({
      ...n,
      // normalizziamo read in caso arrivi solo read_at
      read: n.read ?? (n.read_at != null),
    }));

    setNotifications(items);
    setLoading(false);

    // ✅ mark-all-read appena apri la pagina (DOPO aver settato lista)
    // lo facciamo in background (non await) per non bloccare UI
    if (items.some((n) => n.read_at == null && n.read !== true)) {
      void markAllAsReadOptimistic();
    } else {
      setNotificationsBadgeCount(0);
    }
  }, [markAllAsReadOptimistic]);

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
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => {
        const name = getActorName(item);
        const unread = item.read_at == null && item.read !== true;

        return (
          <Pressable
            onPress={() => {
              // UX: quando tocchi una notifica, spariscono subito i pallini (mark-all)
              void markAllAsReadOptimistic();

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
              <Text style={{ color: theme.colors.text, marginTop: 2 }}>{getNotificationMessage(item.kind)}</Text>
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