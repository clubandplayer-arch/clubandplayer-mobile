import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

export default function CreateScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const onPublish = async () => {
    if (!text.trim()) {
      Alert.alert("Testo mancante", "Scrivi qualcosa prima di pubblicare.");
      return;
    }

    // Placeholder: qui in futuro chiameremo l'API /posts
    Alert.alert(
      "Post pronto",
      "Per ora questa è una demo: la pubblicazione vera arriverà nello step successivo."
    );
    setText("");
    router.push("/(tabs)/feed");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!email) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "800" }}>Crea</Text>
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Accesso richiesto</Text>
          <Text style={{ color: "#374151" }}>
            Per creare un post devi prima fare login.
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: "#111827",
              borderRadius: 10,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Vai al login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Crea</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Nuovo post</Text>
        <Text style={{ color: "#374151" }}>
          Stai pubblicando come: <Text style={{ fontWeight: "700" }}>{email}</Text>
        </Text>

        <TextInput
          placeholder="Scrivi un aggiornamento…"
          value={text}
          onChangeText={setText}
          multiline
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            minHeight: 120,
            textAlignVertical: "top",
          }}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setText("")}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "700" }}>Annulla</Text>
          </Pressable>

          <Pressable
            onPress={onPublish}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: "#111827",
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Pubblica</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Prossimo step</Text>
        <Text style={{ color: "#374151" }}>
          Collegare la creazione post al backend (Supabase) e mostrare i post nel feed.
        </Text>
      </View>
    </ScrollView>
  );
}
