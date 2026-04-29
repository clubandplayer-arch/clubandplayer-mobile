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
import { buildPushCopy, normalizePushPayload, resolvePushTargetRoute } from "../../../src/lib/pushPayload";
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
type NotificationGroupItem = {
  id: string;
  items: NotificationItem[];
  kind: string;
  actorName: string;
  actorAvatarUrl?: string | null;
  postId: string | null;
  createdAt: string;
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

function getNotificationCopy(item: NotificationItem): string {
  const normalizedPayload = normalizePushPayload({
    ...(item.payload ?? {}),
    kind: item.kind,
    actor_profile_id: item.actor_profile_id ?? null,
    actorName: getActorName(item),
  });
  const copy = buildPushCopy(normalizedPayload);
  return copy.title ?? copy.body ?? getNotificationMessage(item.kind);
}

function isGroupableKind(kind: string): boolean {
  return kind === "reaction" || kind === "new_reaction" || kind === "like" || kind === "comment" || kind === "new_comment";
}

function groupNotificationsForDisplay(items: NotificationItem[]): NotificationGroupItem[] {
  const windowMs = 1000 * 60 * 8;
  const groups: NotificationGroupItem[] = [];
  for (const item of items) {
    const normalizedPayload = normalizePushPayload({
      ...(item.payload ?? {}),
      kind: item.kind,
      actor_profile_id: item.actor_profile_id ?? null,
    });
    const kind = String(item.kind ?? "").trim().toLowerCase();
    const isGroupable = isGroupableKind(kind);
    const postId = normalizedPayload.postId ?? (normalizedPayload.targetType === "post" ? normalizedPayload.targetId : null);
    const createdAtMs = new Date(item.created_at).getTime();
    const actorName = getActorName(item);
    const normalizedId = normalizeNotificationId(item.id);

    if (isGroupable && postId) {
      const existing = groups.find((group) => {
        if (!isGroupableKind(group.kind)) return false;
        if (group.postId !== postId) return false;
        const headMs = new Date(group.createdAt).getTime();
        if (!Number.isFinite(headMs) || !Number.isFinite(createdAtMs)) return false;
        return Math.abs(headMs - createdAtMs) <= windowMs;
      });
      if (existing) {
        existing.items.push(item);
        continue;
      }
    }

    groups.push({
      id: normalizedId,
      items: [item],
      kind,
      actorName,
      actorAvatarUrl: item.actor?.avatar_url ?? null,
      postId,
      createdAt: item.created_at,
    });
  }
  return groups;
}

function getGroupedCopy(group: NotificationGroupItem): string {
  if (group.items.length <= 1) return getNotificationCopy(group.items[0]);
  const others = group.items.length - 1;
  if (group.kind === "reaction" || group.kind === "new_reaction" || group.kind === "like") {
    return `${group.actorName} e altri ${others} hanno reagito al tuo post`;
  }
  if (group.kind === "comment" || group.kind === "new_comment") {
    return `${group.actorName} e altri ${others} hanno commentato il tuo post`;
  }
  return getNotificationCopy(group.items[0]);
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
  const groupedNotifications = groupNotificationsForDisplay(filteredNotifications);

  if (!groupedNotifications.length) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "700", marginBottom: 8 }}>Notifiche</Text>
        <Text style={{ color: theme.colors.text }}>Nessuna notifica da mostrare.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={groupedNotifications}
      keyExtractor={(group) => group.id}
      renderItem={({ item: group }) => {
        const primary = group.items[0];
        const name = group.actorName;
        const unread = group.items.some((entry) => !isReadNotification(entry));
        const groupIds = group.items.map((entry) => normalizeNotificationId(entry.id));

        return (
          <Pressable
            onPress={async () => {
              if (__DEV__) {
                console.log("[TEMP DEBUG][notifications][tap]", {
                  groupId: group.id,
                  ids: groupIds,
                  kind: primary.kind,
                });
              }

              if (unread) {
                for (const id of groupIds) markAsReadOptimistic(id);
                const ok = await markAsRead(groupIds[0]);
                if (groupIds.length > 1) {
                  const res = await patchNotificationsMarkRead({ ids: groupIds });
                  if (!res.ok) console.log("[notifications][mark-read][group-error]", { ids: groupIds, status: res.status });
                }
                if (!ok) await load();
              }

              const normalizedPayload = normalizePushPayload({
                ...(primary.payload ?? {}),
                kind: primary.kind,
                actor_profile_id: primary.actor_profile_id ?? null,
                postId: group.postId,
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
            <Avatar name={name} avatarUrl={group.actorAvatarUrl} />

            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: unread ? "600" : "500" }}>{name}</Text>
              <Text style={{ color: theme.colors.text, marginTop: 2 }}>{getGroupedCopy(group)}</Text>
              <Text style={{ color: theme.colors.muted, marginTop: 6, fontSize: 12 }}>
                {new Date(group.createdAt).toLocaleString()}
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
