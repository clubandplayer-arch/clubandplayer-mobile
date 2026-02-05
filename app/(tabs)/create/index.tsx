import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";
import { createPost } from "../../../src/lib/posts/createPost";

type DraftMedia = {
  uri: string;
  mediaType: "image" | "video";
};

const MAX_MEDIA = 6;

async function pickMediaFromDevice(): Promise<DraftMedia | null> {
  try {
    const ImagePicker = await import("expo-image-picker");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permesso galleria non concesso");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"] as any,
      quality: 0.9,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];
    const mediaType = asset.type === "video" ? "video" : "image";
    return {
      uri: asset.uri,
      mediaType,
    };
  } catch (error: any) {
    throw new Error(error?.message ? String(error.message) : "Selettore media non disponibile");
  }
}

export default function CreateScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setIsLoggedIn(Boolean(data.user?.id));
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

  const canPublish = useMemo(() => {
    return Boolean(text.trim() || media.length > 0) && !isPublishing;
  }, [isPublishing, media.length, text]);

  const onAddMedia = async () => {
    if (media.length >= MAX_MEDIA) {
      Alert.alert("Limite raggiunto", `Puoi aggiungere massimo ${MAX_MEDIA} media.`);
      return;
    }

    try {
      const selected = await pickMediaFromDevice();
      if (!selected) return;
      setMedia((prev) => [...prev, selected].slice(0, MAX_MEDIA));
    } catch (error: any) {
      Alert.alert("Errore", error?.message ? String(error.message) : "Impossibile selezionare media");
    }
  };

  const onRemoveMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setText("");
    setMedia([]);
  };

  const onPublish = async () => {
    if (!isLoggedIn) {
      Alert.alert("Accedi per pubblicare", "Per creare un post devi prima effettuare il login.");
      router.replace("/(auth)/login");
      return;
    }

    if (!text.trim() && media.length === 0) {
      Alert.alert("Contenuto mancante", "Inserisci testo o almeno un media.");
      return;
    }

    try {
      setIsPublishing(true);
      await createPost({
        text,
        media,
        supabase,
      });
      resetForm();
      router.replace(`/(tabs)/feed?refresh=${Date.now()}`);
    } catch (error: any) {
      Alert.alert("Errore pubblicazione", error?.message ? String(error.message) : "Operazione non riuscita");
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Crea</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Nuovo post</Text>
        <Text style={{ color: "#374151" }}>
          Stai pubblicando come: <Text style={{ fontWeight: "700" }}>{email ?? "utente anonimo"}</Text>
        </Text>

        <TextInput
          placeholder="Scrivi un aggiornamento…"
          value={text}
          onChangeText={setText}
          multiline
          editable={!isPublishing}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            minHeight: 120,
            textAlignVertical: "top",
          }}
        />

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "700", color: "#111827" }}>Media ({media.length}/{MAX_MEDIA})</Text>
            <Pressable
              onPress={onAddMedia}
              disabled={isPublishing || media.length >= MAX_MEDIA}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: "#111827",
                borderRadius: 10,
                opacity: isPublishing || media.length >= MAX_MEDIA ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "700" }}>Aggiungi media</Text>
            </Pressable>
          </View>

          {media.length > 0 ? (
            <View style={{ gap: 8 }}>
              {media.map((item, index) => (
                <View
                  key={`${item.uri}-${index}`}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {item.mediaType === "image" ? (
                    <Image source={{ uri: item.uri }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
                  ) : (
                    <View style={{ height: 100, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#374151", fontWeight: "700" }}>🎬 Video selezionato</Text>
                    </View>
                  )}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>
                      {item.mediaType === "video" ? "Video" : "Immagine"} #{index + 1}
                    </Text>
                    <Pressable onPress={() => onRemoveMedia(index)} disabled={isPublishing}>
                      <Text style={{ color: "#b91c1c", fontWeight: "700" }}>Rimuovi</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: "#6b7280" }}>Nessun media selezionato.</Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={resetForm}
            disabled={isPublishing}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: "#111827",
              borderRadius: 10,
              opacity: isPublishing ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "700" }}>Annulla</Text>
          </Pressable>

          <Pressable
            onPress={onPublish}
            disabled={!canPublish}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: "#111827",
              borderRadius: 10,
              opacity: canPublish ? 1 : 0.5,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Pubblica</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
