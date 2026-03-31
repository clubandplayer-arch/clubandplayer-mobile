import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadProfileAvatar } from "../../src/lib/api";

type Props = {
  value?: string | null;
  onChange: (avatarUrl: string | null) => void;
};

export function AvatarUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

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
        allowsEditing: false,
      });

      if (picked.canceled || !picked.assets?.length) return;
      setPendingAsset(picked.assets[0]);
    } catch (error) {
      Alert.alert("Errore", "Impossibile completare la selezione o il caricamento dell'avatar.");
    }
  }, []);

  const onConfirmAvatar = useCallback(async () => {
    if (!pendingAsset) return;
    setUploading(true);
    try {
      const result = await uploadProfileAvatar({
        uri: pendingAsset.uri,
        fileName: pendingAsset.fileName ?? `avatar-${Date.now()}.jpg`,
        mimeType: pendingAsset.mimeType ?? undefined,
      });

      if (!result.ok) {
        Alert.alert("Errore", result.errorText ?? "Upload avatar fallito.");
        return;
      }

      onChange(result.data?.avatar_url ?? null);
      setPendingAsset(null);
      Alert.alert("Salvato", "Avatar aggiornato. Ricordati di salvare il profilo.");
    } catch (error) {
      Alert.alert("Errore", "Impossibile confermare l'avatar.");
    } finally {
      setUploading(false);
    }
  }, [onChange, pendingAsset]);

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

      <Modal
        visible={Boolean(pendingAsset)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (uploading) return;
          setPendingAsset(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Conferma avatar</Text>
            <Text style={{ color: "#4b5563" }}>Controlla l'anteprima prima di confermare l'avatar.</Text>

            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
              <View style={{ width: 240, height: 240, borderRadius: 120, overflow: "hidden", backgroundColor: "#e5e7eb" }}>
                {pendingAsset ? (
                  <Image source={{ uri: pendingAsset.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : null}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                disabled={uploading}
                onPress={() => setPendingAsset(null)}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#111827" }}>Annulla</Text>
              </Pressable>

              <Pressable
                disabled={uploading}
                onPress={() => void onConfirmAvatar()}
                style={{
                  flex: 1,
                  backgroundColor: uploading ? "#9ca3af" : "#111827",
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontWeight: "700", color: "#fff" }}>Conferma avatar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
