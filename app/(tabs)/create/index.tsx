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
import * as FileSystem from "expo-file-system";
// @ts-ignore -- module types are provided by dependency in real environment
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../../src/lib/supabase";
import { emit } from "../../../src/lib/events/appEvents";
import { createPost } from "../../../src/lib/posts/createPost";
import BrandHeader from "../../../src/components/brand/BrandHeader";
import { theme } from "../../../src/theme";

type DraftMedia = {
  uri: string;
  mediaType: "image" | "video";
  size?: number | null;
};

const MAX_MEDIA = 6;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 80 * 1024 * 1024;

async function pickMediaFromDevice(): Promise<DraftMedia | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permesso galleria non concesso");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.9,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];
    const mediaType = asset.type === "video" ? "video" : "image";
    const sizeFromAsset = typeof asset.fileSize === "number" ? asset.fileSize : null;

    let size = sizeFromAsset;
    if (size == null) {
      try {
        const info = await FileSystem.getInfoAsync(asset.uri);
        if (info?.exists && typeof info.size === "number") {
          size = info.size;
        }
      } catch {
        size = null;
      }
    }

    return {
      uri: asset.uri,
      mediaType,
      size,
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
  const [publishStep, setPublishStep] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);

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
    if (isPublishing) return;

    if (media.length >= MAX_MEDIA) {
      Alert.alert("Massimo 6 media", "Puoi aggiungere al massimo 6 media.");
      return;
    }

    try {
      const selected = await pickMediaFromDevice();
      if (!selected) return;

      if (selected.mediaType === "image" && typeof selected.size === "number" && selected.size > MAX_IMAGE_SIZE_BYTES) {
        Alert.alert("File troppo grande", "Le immagini possono essere al massimo di 8MB.");
        return;
      }

      if (selected.mediaType === "video" && typeof selected.size === "number" && selected.size > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert("File troppo grande", "I video possono essere al massimo di 80MB.");
        return;
      }

      setMedia((prev) => {
        if (prev.length >= MAX_MEDIA) {
          Alert.alert("Massimo 6 media", "Puoi aggiungere al massimo 6 media.");
          return prev;
        }
        return [...prev, selected];
      });
    } catch (error: any) {
      Alert.alert("Errore", error?.message ? String(error.message) : "Impossibile selezionare media");
    }
  };

  const onRemoveMedia = (index: number) => {
    if (isPublishing) return;
    setMedia((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setText("");
    setMedia([]);
    setPublishError(null);
    setPublishStep("");
  };

  const onPublish = async () => {
    if (isPublishing) return;

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
      setPublishError(null);
      setIsPublishing(true);
      setPublishStep("Creazione post…");

      await createPost({
        text,
        media,
        supabase,
        onProgress: (step) => setPublishStep(step),
      });

      resetForm();
      setPublishStep("Completato");
      emit("feed:refresh");
      router.replace("/(tabs)/feed");
    } catch (error: any) {
      setPublishError(error?.message ? String(error.message) : "Operazione non riuscita");
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
      <BrandHeader subtitle="Crea" />

      {(isPublishing || publishError) && (
        <View
          style={{
            borderWidth: 1,
            borderColor: publishError ? theme.colors.dangerBorder : theme.colors.neutral200,
            backgroundColor: publishError ? theme.colors.dangerBg : theme.colors.neutral50,
            borderRadius: 12,
            padding: 12,
            gap: 8,
          }}
        >
          {isPublishing ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={theme.colors.text} />
              <Text style={{ fontWeight: "700", color: theme.colors.text }}>Pubblicazione in corso…</Text>
            </View>
          ) : null}

          {publishStep ? <Text style={{ color: theme.colors.text }}>Step: {publishStep}</Text> : null}

          {publishError ? <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>{publishError}</Text> : null}

          {publishError ? (
            <Pressable
              onPress={onPublish}
              disabled={isPublishing}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: theme.colors.danger,
                borderRadius: 10,
                alignSelf: "flex-start",
                opacity: isPublishing ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Riprova</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Nuovo post</Text>
        <Text style={{ color: theme.colors.text }}>
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
            <Text style={{ fontWeight: "700", color: theme.colors.text }}>Media ({media.length}/{MAX_MEDIA})</Text>
            <Pressable
              onPress={onAddMedia}
              disabled={isPublishing || media.length >= MAX_MEDIA}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: theme.colors.text,
                borderRadius: 10,
                opacity: isPublishing || media.length >= MAX_MEDIA ? 0.6 : 1,
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Aggiungi media</Text>
            </Pressable>
          </View>

          {media.length > 0 ? (
            <View style={{ gap: 8 }}>
              {media.map((item, index) => (
                <View
                  key={`${item.uri}-${index}`}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neutral200,
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: theme.colors.neutral50,
                  }}
                >
                  {item.mediaType === "image" ? (
                    <Image source={{ uri: item.uri }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
                  ) : (
                    <View style={{ height: 100, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: theme.colors.text, fontWeight: "700" }}>🎬 Video selezionato</Text>
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
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      {item.mediaType === "video" ? "Video" : "Immagine"} #{index + 1}
                    </Text>
                    <Pressable onPress={() => onRemoveMedia(index)} disabled={isPublishing}>
                      <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Rimuovi</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted }}>Nessun media selezionato.</Text>
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
              borderColor: theme.colors.text,
              borderRadius: 10,
              opacity: isPublishing ? 0.6 : 1,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Annulla</Text>
          </Pressable>

          <Pressable
            onPress={onPublish}
            disabled={!canPublish}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: theme.colors.text,
              borderRadius: 10,
              opacity: canPublish ? 1 : 0.5,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isPublishing ? <ActivityIndicator size="small" color={theme.colors.background} /> : null}
            <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Pubblica</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
