import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
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

import { fetchDirectMessageThread, postDirectMessage, postDirectMessageMarkRead } from "../../../src/lib/api";
import type { DirectMessage, DirectThreadResponse } from "../../../src/types/directMessages";
import { theme } from "../../../src/theme";
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

  // Android only: we manually shift the composer above the keyboard.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const listRef = useRef<FlatList<DirectMessage>>(null);
  const insets = useSafeAreaInsets();

  const composerMinHeight = 76;

  // ✅ anti-overlap: evita fetch concorrenti e polling “a raffica”
  const inflightRef = useRef(false);
  const didMarkThreadReadRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
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

  // ✅ scroll quando cambia il numero messaggi
  useEffect(() => {
    if (!thread?.messages?.length) return;
    scrollToBottom();
  }, [scrollToBottom, thread?.messages?.length]);

  // ✅ IMPORTANT:
  // - iOS: KeyboardAvoidingView handles layout
  // - Android: DO NOT use KeyboardAvoidingView (to avoid double offsets/gaps)
  useEffect(() => {
    if (Platform.OS !== "android") return;

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

  const peerName = useMemo(() => {
    const full = thread?.peer?.full_name?.trim();
    const display = thread?.peer?.display_name?.trim();
    return full || display || "Messaggi";
  }, [thread?.peer?.display_name, thread?.peer?.full_name]);

  const peerSubLabel = useMemo(() => {
    const full = thread?.peer?.full_name?.trim();
    const display = thread?.peer?.display_name?.trim();

    // mostra la seconda riga solo se è diversa dal titolo
    if (display && full && display !== full) return display;

    // altrimenti non mostrare nulla
    return undefined;
  }, [thread?.peer?.display_name, thread?.peer?.full_name]);

  const avatarUri = thread?.peer?.avatar_url?.trim();

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
    Platform.OS === "android" && keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 12);

  const listBottomPadding =
    composerMinHeight +
    composerBottomPadding +
    8 +
    (Platform.OS === "android" ? keyboardHeight : 0);

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
        <Pressable onPress={() => router.back()} hitSlop={8}>
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
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
              {peerName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>{peerName}</Text>

          {peerSubLabel ? (
            <Text style={{ fontSize: 13, color: theme.colors.muted }}>{peerSubLabel}</Text>
          ) : null}

          {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
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

          // ✅ Android: push composer exactly above keyboard (NO KeyboardAvoidingView on Android)
          marginBottom: Platform.OS === "android" ? keyboardHeight : 0,

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
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {Content}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>{Content}</View>
      )}
    </SafeAreaView>
  );
}
