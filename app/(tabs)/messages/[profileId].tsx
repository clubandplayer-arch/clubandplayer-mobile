import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  AppState,
  type AppStateStatus,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import {
  deleteDirectMessageConversation,
  fetchDirectMessageThread,
  postDirectMessage,
  postDirectMessageMarkRead,
} from "../../../src/lib/api";
import type { DirectMessage, DirectThreadResponse } from "../../../src/types/directMessages";
import { theme } from "../../../src/theme";
import { getProfileDisplayName } from "../../../src/lib/profiles/getProfileDisplayName";
import { emit } from "../../../src/lib/events/appEvents";

function resolveProfileId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return "";
  }
}

export default function DirectMessageThreadScreen() {
  const params = useLocalSearchParams<{ profileId?: string | string[] }>();
  const profileId = resolveProfileId(params.profileId).trim();
  const router = useRouter();

  const [thread, setThread] = useState<DirectThreadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Keyboard offset used to keep the composer visible above keyboard (Android + iOS).
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const listRef = useRef<FlatList<DirectMessage>>(null);
  const didInitialScrollRef = useRef(false);
  const insets = useSafeAreaInsets();

  const composerMinHeight = 76;

  // ✅ anti-overlap: evita fetch concorrenti e polling “a raffica”
  const inflightRef = useRef(false);
  const didMarkThreadReadRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const loadThread = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!profileId) {
        setThread(null);
        setError("Profilo non valido");
        return;
      }

      if (inflightRef.current) return;
      inflightRef.current = true;

      if (!opts?.silent) setError(null);

      try {
        const response = await fetchDirectMessageThread(profileId);
        if (!response.ok || !response.data) {
          setThread(null);
          setError(response.errorText || "Impossibile caricare la conversazione");
          return;
        }

        const messages = Array.isArray(response.data.messages) ? response.data.messages : [];
        setThread({ ...response.data, messages });
      } finally {
        inflightRef.current = false;
      }
    },
    [profileId],
  );

  const markThreadRead = useCallback(async () => {
    if (!profileId) return;
    if (didMarkThreadReadRef.current) return;
    didMarkThreadReadRef.current = true;

    const res = await postDirectMessageMarkRead(profileId);
    if (!res?.ok) {
      didMarkThreadReadRef.current = false;
      return;
    }

    emit("app:direct-messages-updated");
  }, [profileId]);

  useEffect(() => {
    didMarkThreadReadRef.current = false;
  }, [profileId]);

  useEffect(() => {
    setThread(null);
  }, [profileId]);

  // ✅ load iniziale
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await loadThread();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadThread]);

  // Keep composer visible on both Android and iOS.
  useEffect(() => {
    if (Platform.OS === "android") {
      const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
        setKeyboardHeight(e.endCoordinates?.height ?? 0);
      });
      const hideSub = Keyboard.addListener("keyboardDidHide", () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }

    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardHeight(0);
    });
    const frameSub = Keyboard.addListener("keyboardWillChangeFrame", (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub.remove();
    };
  }, []);

  // ✅ refresh quando entri/torni in focus (certezze: serve per vedere messaggi arrivati “nel mentre”)
  useFocusEffect(
    useCallback(() => {
      void loadThread({ silent: true });
      void markThreadRead();

      return () => {
        // niente
      };
    }, [loadThread, markThreadRead]),
  );

  // ✅ polling leggero mentre la screen è visibile (solo se app foreground)
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();

    // ogni 3s è abbastanza “rapido” senza stressare rete
    pollTimerRef.current = setInterval(() => {
      if (appStateRef.current !== "active") return;
      void loadThread({ silent: true });
    }, 3000);
  }, [loadThread, stopPolling]);

  useFocusEffect(
    useCallback(() => {
      startPolling();
      return () => stopPolling();
    }, [startPolling, stopPolling]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
      // quando torni active, fai un refresh immediato
      if (next === "active") void loadThread({ silent: true });
    });
    return () => sub.remove();
  }, [loadThread]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || !profileId) return;

    setSending(true);
    setError(null);

    try {
      const response = await postDirectMessage(profileId, content);
      if (!response.ok || !response.data?.message) {
        setError(response.errorText || "Invio non riuscito");
        return;
      }

      setInput("");

      // ✅ optimistic append (istantaneo)
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), response.data.message],
        };
      });

      emit("app:direct-messages-updated");
      scrollToBottom();

      // ✅ riallinea con server (certezze: evita “messaggio non arriva / ordine sbagliato / altri messaggi mancanti”)
      await loadThread({ silent: true });
      scrollToBottom();
    } catch {
      setError("Invio non riuscito");
    } finally {
      setSending(false);
    }
  }, [input, profileId, scrollToBottom, loadThread]);

  const handleDeleteConversation = useCallback(() => {
    if (!profileId) return;

    Alert.alert("Cancella chat", "Vuoi eliminare tutta la chat?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Ok",
        style: "destructive",
        onPress: async () => {
          const res = await deleteDirectMessageConversation(profileId);
          if (!res?.ok) {
            setError(res?.errorText || "Impossibile cancellare la chat");
            return;
          }

          setThread((prev) => (prev ? { ...prev, messages: [] } : prev));
          emit("app:direct-messages-updated");
          router.replace("/(tabs)/messages");
        },
      },
    ]);
  }, [profileId, router]);

  const peerName = useMemo(() => {
    return getProfileDisplayName(thread?.peer ?? null);
  }, [thread?.peer]);

  const peerSubLabel = "Messaggi diretti";

  const avatarUri = useMemo(() => {
    const raw = thread?.peer?.avatar_url;
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, [thread?.peer?.avatar_url]);

  const renderItem = useCallback(
    ({ item }: { item: DirectMessage }) => {
      const mine = item.sender_profile_id === thread?.currentProfileId;

      return (
        <View
          style={{
            alignItems: mine ? "flex-end" : "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          <View
            style={{
              maxWidth: "80%",
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: mine ? theme.colors.primary : theme.colors.neutral200,
            }}
          >
            <Text style={{ color: mine ? theme.colors.background : theme.colors.text }}>
              {item.content}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>
            {formatWhen(item.created_at)}
          </Text>
        </View>
      );
    },
    [thread?.currentProfileId],
  );

  const composerBottomPadding =
    keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 12);

  const composerKeyboardOffset = useMemo(() => {
    if (keyboardHeight <= 0) return 0;
    if (Platform.OS === "ios") {
      return Math.max(0, keyboardHeight - insets.bottom);
    }
    return keyboardHeight;
  }, [insets.bottom, keyboardHeight]);

  const listBottomPadding =
    composerMinHeight +
    composerBottomPadding +
    8;

  const messages = useMemo(() => {
    const raw = thread?.messages ?? [];
    if (raw.length <= 1) return raw;

    const seen = new Set<string>();
    const out: typeof raw = [];

    for (const m of raw) {
      const key = String(m?.id ?? "");
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }

    return out;
  }, [thread?.messages]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const Content = (
    <>
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.neutral100,
          backgroundColor: theme.colors.background,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable onPress={() => router.replace("/(tabs)/messages")} hitSlop={8}>
          <Text style={{ fontSize: 20, color: theme.colors.text }}>←</Text>
        </Pressable>

        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: 40, height: 40, borderRadius: 20 }} />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.neutral200,
            }}
          >
            {peerName ? (
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                {peerName.slice(0, 1).toUpperCase()}
              </Text>
            ) : null}
          </View>
        )}

        <View style={{ flex: 1 }}>
          {peerName ? (
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>
              {peerName}
            </Text>
          ) : null}

          {peerSubLabel ? (
            <Text style={{ fontSize: 13, color: theme.colors.muted }}>{peerSubLabel}</Text>
          ) : null}

          {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
        </View>

        <Pressable onPress={handleDeleteConversation} hitSlop={8}>
          <Text style={{ color: theme.colors.danger, fontWeight: "600" }}>Cancella chat</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        onLayout={() => {
          if (didInitialScrollRef.current) return;
          didInitialScrollRef.current = true;
          scrollToBottom(false);
        }}
        onContentSizeChange={() => {
          scrollToBottom(true);
        }}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingVertical: 8,
          paddingBottom: listBottomPadding,
        }}
        keyboardShouldPersistTaps="handled"
      />

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.neutral100,
          paddingTop: 12,
          paddingHorizontal: 12,
          paddingBottom: composerBottomPadding,

          // Keep composer just above keyboard on both platforms.
          marginBottom: composerKeyboardOffset,

          flexDirection: "row",
          gap: 8,
          alignItems: "flex-end",
          minHeight: composerMinHeight,
          backgroundColor: theme.colors.background,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Scrivi un messaggio"
          multiline
          style={{
            flex: 1,
            minHeight: 40,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
          }}
        />
        <Pressable
          onPress={sendMessage}
          disabled={sending || !input.trim()}
          style={{
            backgroundColor: theme.colors.primary,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: sending || !input.trim() ? 0.6 : 1,
          }}
        >
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Invia</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top", "bottom"]}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>{Content}</View>
    </SafeAreaView>
  );
}
