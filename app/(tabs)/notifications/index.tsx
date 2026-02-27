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
      if (item.payload?.status === "accepted") return "ha accettato la tua candidatura";
      return "ha aggiornato lo stato della candidatura";
    default:
      return "Nuova notifica";
  }
}

/**
 * Normalizza la risposta di fetchNotifications() perché può essere:
 * - res.data = NotificationItem[]
 * - res.data = { ok: true, data: NotificationItem[] }
 * - res.data = { data: NotificationItem[] }
 */
function extractItems(res: any): NotificationItem[] {
  const d = res?.data;

  if (Array.isArray(d)) return d as NotificationItem[];

  const nested = d?.data;
  if (Array.isArray(nested)) return nested as NotificationItem[];

  const nested2 = d?.items;
  if (Array.isArray(nested2)) return nested2 as NotificationItem[];

  return [];
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // evita doppie chiamate ravvicinate a mark-all
  const markingRef = useRef(false);

  const markAllAsReadOptimistic = useCallback(async () => {
    if (markingRef.current) return;

    const hasUnread = notifications.some((n) => !n.read);
    if (!hasUnread) return;

    markingRef.current = true;

    try {
      await postNotificationsMarkAllRead();

      // update ottimistico: non toccare lista/ordine, solo read=true
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotificationsBadgeCount(0);
    } finally {
      markingRef.current = false;
    }
  }, [notifications]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

    const res = await fetchNotifications();

    if (!res.ok) {
      // NON svuotare la lista se fallisce
      setErrorText(res.errorText ?? `Errore caricamento notifiche (${res.status})`);
      setLoading(false);
      return;
    }

    const items = extractItems(res);

    // Se per qualsiasi motivo items è vuoto ma prima avevamo roba, NON cancellare
    // (evita flicker/“sparite tutte” per payload imprevisti)
    if (items.length > 0) {
      setNotifications(items);
    }

    setLoading(false);

    // Mark-all quando entri, ma SOLO se abbiamo items e c'è unread
    if (items.length > 0 && items.some((n) => !n.read)) {
      // non await per non bloccare UI
      void markAllAsReadOptimistic();
    } else if (items.length > 0 && items.every((n) => n.read)) {
      // allineiamo badge a 0 se backend dice tutto letto
      setNotificationsBadgeCount(0);
    }
  }, [markAllAsReadOptimistic]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = async (item: NotificationItem) => {
    // UX richiesta: appena clicchi, spariscono i pallini (mark-all)
    await markAllAsReadOptimistic();

    if (item.kind === "new_comment" || item.kind === "new_reaction") {
      if (item.payload?.post_id) router.push(`/posts/${item.payload.post_id}`);
      return;
    }

    if (item.kind === "message") {
      if (item.payload?.thread_id) router.push(`/messages/${item.payload.thread_id}`);
      return;
    }

    if (item.kind === "application_status") {
      if (item.payload?.opportunity_id) router.push(`/opportunities/${item.payload.opportunity_id}`);
      return;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (errorText && notifications.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontWeight: "800", fontSize: 18, color: theme.colors.text }}>Notifiche</Text>
        <Text style={{ color: theme.colors.danger }}>{errorText}</Text>
        <Pressable
          onPress={load}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={
        <View style={{ paddingTop: 24 }}>
          <Text style={{ color: theme.colors.muted }}>Nessuna notifica.</Text>
        </View>
      }
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
              <Image source={{ uri: item.actor.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
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
              <Text style={{ fontWeight: "800", color: theme.colors.text }}>{name}</Text>
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