import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { fetchNotifications } from "../../../src/lib/api";
import { theme } from "../../../src/theme";

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
  recipient_profile_id?: string | null;
  actor?: NotificationActor | null;
};

function isEmailLike(v?: string | null) {
  return !!v && v.includes("@");
}

// Notifiche: preferiamo public_name (coerente con backend), poi full_name, poi display_name (non email)
function getActorName(n: NotificationItem): string {
  if (n.actor?.public_name) return n.actor.public_name;
  if (n.actor?.full_name) return n.actor.full_name;

  const dn = n.actor?.display_name ?? null;
  if (dn && !isEmailLike(dn)) return dn;

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
    case "new_application_received":
      return "nuova candidatura ricevuta";
    case "message":
      return "ti ha scritto un messaggio";
    default:
      return "nuova notifica";
  }
}

function getInitial(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "U";
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

  // ✅ evita reload loop: carichiamo una volta al mount
  const didLoadRef = useRef(false);

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

    if (!res.ok) {
      setNotifications([]);
      setErrorText(res.errorText || `Errore caricamento notifiche (HTTP ${res.status})`);
      setLoading(false);
      return;
    }

    const items = ((res.data?.data as NotificationItem[]) ?? []).map((n) => ({
      ...n,
      read: n.read ?? (n.read_at != null),
    }));

    setNotifications(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void load();
  }, [load]);

  // ✅ Segna LETTA SOLO la notifica cliccata (NON mark-all)
  const markOneReadLocal = (id: string | number) => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        String(n.id) === String(id)
          ? { ...n, read: true, read_at: n.read_at ?? nowIso }
          : n
      )
    );
  };

  const handlePress = (item: NotificationItem) => {
    // 1) UX: quella cliccata diventa letta, le altre restano NON lette
    markOneReadLocal(item.id);

    const p: any = item.payload ?? {};

    // 2) Deep link: COMMENT/REACTION → post
    if ((item.kind === "new_comment" || item.kind === "new_reaction") && typeof p.post_id === "string") {
      router.push(`/posts/${p.post_id}`);
      return;
    }

    // 3) Deep link: MESSAGE → la tua route è /messages/[profileId]
    //    quindi apriamo la chat col profilo dell'attore (mittente)
    if (item.kind === "message") {
      const peerProfileId =
        (typeof item.actor_profile_id === "string" && item.actor_profile_id) ||
        (typeof p.sender_profile_id === "string" && p.sender_profile_id) ||
        null;

      if (peerProfileId) {
        router.push(`/messages/${peerProfileId}`);
        return;
      }

      console.log("[notifications] message deep link missing peer id", item.id, p);
      return;
    }

    // 4) Altri tipi: per ora non deep-linkiamo (evita rotture)
    console.log("TODO notifications deep link", item.id, item.kind, p);
  };

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
            onPress={() => handlePress(item)}
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