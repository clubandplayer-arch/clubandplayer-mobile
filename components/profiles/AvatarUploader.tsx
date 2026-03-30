import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { uploadProfileAvatar } from "../../src/lib/api";

type Props = {
  value?: string | null;
  onChange: (avatarUrl: string | null) => void;
};

export function AvatarUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const preview = useMemo(() => {
    const url = String(value ?? "").trim();
    return url.length > 0 ? url : null;
  }, [value]);

  const onPick = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permesso richiesto", "Consenti accesso alle foto per cambiare avatar.");
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        legacy: Platform.OS === "android",
      });

      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];

      setUploading(true);
      const result = await uploadProfileAvatar({
        uri: asset.uri,
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? undefined,
      });

      if (!result.ok) {
        Alert.alert("Errore", result.errorText ?? "Upload avatar fallito.");
        return;
      }

      onChange(result.data?.avatar_url ?? null);
    } catch (error) {
      Alert.alert("Errore", "Impossibile completare la selezione o il caricamento dell'avatar.");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  return (
    <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>Avatar</Text>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {preview ? (
          <Image
            source={{ uri: preview }}
            style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#e5e7eb" }}
          />
        ) : (
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "#e5e7eb",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#6b7280" }}>No Avatar</Text>
          </View>
        )}
      </View>

      <Pressable
        disabled={uploading}
        onPress={() => void onPick()}
        style={{
          backgroundColor: uploading ? "#9ca3af" : "#111827",
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "700" }}>Cambia foto</Text>
        )}
      </Pressable>
    </View>
  );
}
