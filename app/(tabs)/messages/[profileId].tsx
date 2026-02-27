import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchDirectMessageThread, postDirectMessage } from "../../../src/lib/api";
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
  const listRef = useRef<FlatList<DirectMessage>>(null);
  const insets = useSafeAreaInsets();

  const composerMinHeight = 76;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const loadThread = useCallback(async () => {
    if (!profileId) {
      setThread(null);
      setError("Profilo non valido");
      return;
    }

    setError(null);
    const response = await fetchDirectMessageThread(profileId);
    if (!response.ok || !response.data) {
      setThread(null);
      setError(response.errorText || "Impossibile caricare la conversazione");
      return;
    }

    const messages = Array.isArray(response.data.messages) ? response.data.messages : [];
    setThread({ ...response.data, messages });
  }, [profileId]);

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
  }, [loadThread, profileId]);

  useEffect(() => {
    if (!thread?.messages?.length) return;
    scrollToBottom();
  }, [scrollToBottom, thread?.messages?.length]);

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
      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...(prev.messages || []), response.data.message],
        };
      });

      emit("app:direct-messages-updated");
      scrollToBottom();
    } catch (e) {
      setError("Invio non riuscito");
    } finally {
      setSending(false);
    }
  }, [input, profileId, scrollToBottom]);

  const peerName = useMemo(
    () => thread?.peer?.full_name || thread?.peer?.display_name || "Messaggi",
    [thread?.peer?.display_name, thread?.peer?.full_name],
  );
  const peerSubLabel = useMemo(() => thread?.peer?.display_name || "Club And Player", [thread?.peer?.display_name]);
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
            <Text style={{ color: mine ? theme.colors.background : theme.colors.text }}>{item.content}</Text>
          </View>
          <Text style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>{formatWhen(item.created_at)}</Text>
        </View>
      );
    },
    [thread?.currentProfileId],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{peerName.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>{peerName}</Text>
            <Text style={{ fontSize: 13, color: theme.colors.muted }}>{peerSubLabel}</Text>
            {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={thread?.messages || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: composerMinHeight + Math.max(insets.bottom, 12) }}
        />

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.neutral100,
            paddingTop: 12,
            paddingHorizontal: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            flexDirection: "row",
            gap: 8,
            alignItems: "flex-end",
            minHeight: composerMinHeight,
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
