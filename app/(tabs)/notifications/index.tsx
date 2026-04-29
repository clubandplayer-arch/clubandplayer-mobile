import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { fetchNotifications, patchNotificationsMarkRead } from "../../../src/lib/api";
import { emit } from "../../../src/lib/events/appEvents";
import { setNotificationsBadgeCount } from "../../../src/lib/notificationsBadge";
import {
  isNotificationLocallyRead,
  markNotificationLocallyRead,
  settleNotificationReadFromServer,
  unmarkNotificationLocallyRead,
} from "../../../src/lib/notificationsLocalRead";
import { getProfileDisplayName } from "../../../src/lib/profiles/getProfileDisplayName";
import { normalizePushPayload, resolvePushTargetRoute } from "../../../src/lib/pushPayload";
import { theme } from "../../../src/theme";
import { useRouter } from "expo-router";

type NotificationActor = {
  id?: string;
  display_name?: string | null;
  full_name?: string | null;
  public_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  name?: string | null;
  club_name?: string | null;
  company_name?: string | null;
  profile_name?: string | null;
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

const isChatMessageKind = (kind?: string | null) => kind === "message" || kind === "new_message";

function isReadNotification(notification: NotificationItem): boolean {
  if (notification.read === true) return true;
  if (typeof notification.read_at === "string" && notification.read_at.trim().length > 0) return true;
  return false;
}

function normalizeActor(notification: NotificationItem): NotificationActor | null {
  const actor = notification.actor ?? null;
  const payload = notification.payload ?? {};
  const payloadActor = payload?.actor ?? payload?.sender ?? payload?.profile ?? null;

  if (!actor && !payloadActor) return null;

  return {
    ...(payloadActor ?? {}),
    ...(actor ?? {}),
    public_name: actor?.public_name ?? payloadActor?.public_name ?? payload?.actor_public_name ?? null,
    display_name: actor?.display_name ?? payloadActor?.display_name ?? payload?.actor_display_name ?? null,
    full_name: actor?.full_name ?? payloadActor?.full_name ?? payload?.actor_full_name ?? null,
    first_name: actor?.first_name ?? payloadActor?.first_name ?? payload?.actor_first_name ?? null,
    last_name: actor?.last_name ?? payloadActor?.last_name ?? payload?.actor_last_name ?? null,
    name: actor?.name ?? payloadActor?.name ?? payload?.actor_name ?? null,
    club_name: actor?.club_name ?? payloadActor?.club_name ?? payload?.actor_club_name ?? payload?.club_name ?? null,
    company_name: actor?.company_name ?? payloadActor?.company_name ?? payload?.actor_company_name ?? payload?.company_name ?? null,
    profile_name: actor?.profile_name ?? payloadActor?.profile_name ?? payload?.actor_profile_name ?? payload?.profile_name ?? null,
    username: actor?.username ?? payloadActor?.username ?? payload?.actor_username ?? null,
    account_type: actor?.account_type ?? payloadActor?.account_type ?? payload?.actor_account_type ?? null,
    avatar_url: actor?.avatar_url ?? payloadActor?.avatar_url ?? payload?.actor_avatar_url ?? null,
  };
}

function normalizeNotification(notification: NotificationItem): NotificationItem {
  const normalizedActor = normalizeActor(notification);
  return {
    ...notification,
    actor: normalizedActor,
    read: isReadNotification(notification),
    read_at:
      typeof notification.read_at === "string" && notification.read_at.trim().length > 0
        ? notification.read_at
        : notification.read
          ? notification.read_at ?? new Date(0).toISOString()
          : null,
  };
}

function getActorName(notification: NotificationItem): string {
  const actor = normalizeActor(notification);
  return getProfileDisplayName(actor ?? null);
}

function countUnreadNotifications(items: NotificationItem[]): number {
  return items.filter((n) => !isChatMessageKind(n.kind) && !isReadNotification(n)).length;
}

function normalizeNotificationId(notificationId: string | number): string {
  return String(notificationId ?? "").trim();
}

function mergeWithLocalReadState(serverItems: NotificationItem[]): NotificationItem[] {
  return serverItems.map((item) => {
    settleNotificationReadFromServer({
      notificationId: item.id,
      read: item.read === true,
      readAt: item.read_at ?? null,
    });

    if (!isNotificationLocallyRead(item.id) || isReadNotification(item)) return item;

    return {
      ...item,
      read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    };
  });
}

function getNotificationMessage(kind: string): string {
  switch (kind) {
    case "comment":
    case "new_comment":
      return "ha commentato un post";
    case "reaction":
    case "new_reaction":
      return "ha reagito a un post";
    case "follower":
    case "follow":
      return "ha iniziato a seguirti";
    case "new_opportunity":
      return "ha pubblicato una nuova opportunità";
    case "application_status":
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

  const load = useCallback(async () => {
    setLoading(true);
    setErrorText(null);

    const res = await fetchNotifications({ limit: 50 });

    if (!res.ok) {
      setNotifications([]);
      setErrorText(res.errorText || `Errore caricamento notifiche (HTTP ${res.status})`);
      setLoading(false);
      return;
    }

    const normalizedServerItems = ((res.data?.data as NotificationItem[]) ?? []).map(normalizeNotification);

    const mergedItems = mergeWithLocalReadState(normalizedServerItems);


    setNotifications(mergedItems);
    setNotificationsBadgeCount(countUnreadNotifications(mergedItems));
    emit("app:notifications-updated");
    setLoading(false);
  }, []);

  const markAsRead = useCallback(async (notificationId: string | number) => {
    const normalizedId = normalizeNotificationId(notificationId);
    const response = await patchNotificationsMarkRead({ ids: [normalizedId] });
    const updatedCount = response.data?.updated ?? 0;

    if (!response.ok || updatedCount <= 0) {
      console.log("[notifications][mark-read][error]", {
        id: normalizedId,
        status: response.status,
        errorText: response.errorText ?? null,
        updated: updatedCount,
      });
      unmarkNotificationLocallyRead(normalizedId);
      return false;
    }

    emit("app:notifications-updated");
    // keep local read mark until a subsequent fetch confirms read state
    return true;
  }, []);

  const markAsReadOptimistic = useCallback((notificationId: string | number) => {
    const normalizedId = normalizeNotificationId(notificationId);
    const nowIso = new Date().toISOString();
    markNotificationLocallyRead(normalizedId);

    setNotifications((prev) => {
      const next = prev.map((notification) => {
        if (normalizeNotificationId(notification.id) !== normalizedId) return notification;
        if (isReadNotification(notification)) return notification;
        return {
          ...notification,
          read: true,
          read_at: nowIso,
        };
      });

      setNotificationsBadgeCount(countUnreadNotifications(next));
      emit("app:notifications-updated");
      return next;
    });
  }, []);

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

  const filteredNotifications = notifications.filter((n) => !isChatMessageKind(n.kind));

  if (!filteredNotifications.length) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 8 }}>Notifiche</Text>
        <Text style={{ color: theme.colors.text }}>Nessuna notifica da mostrare.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredNotifications}
      keyExtractor={(item) => normalizeNotificationId(item.id)}
      renderItem={({ item }) => {
        const name = getActorName(item);
        const unread = !isReadNotification(item);

        return (
          <Pressable
            onPress={async () => {
              if (__DEV__) {
                const normalizedId = normalizeNotificationId(item.id);
                console.log("[TEMP DEBUG][notifications][tap]", {
                  id: normalizedId,
                  idType: typeof item.id,
                  kind: item.kind,
                });
              }

              if (unread) {
                markAsReadOptimistic(item.id);
                const ok = await markAsRead(item.id);
                if (!ok) await load();
              }

              const normalizedPayload = normalizePushPayload({
                ...(item.payload ?? {}),
                kind: item.kind,
                actor_profile_id: item.actor_profile_id ?? null,
              });
              const targetRoute = resolvePushTargetRoute(normalizedPayload, "/(tabs)/notifications");
              router.push(targetRoute as never);
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
