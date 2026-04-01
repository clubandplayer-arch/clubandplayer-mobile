import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { uploadProfileAvatar } from "../../src/lib/api";
import { emit } from "../../src/lib/events/appEvents";

type Props = {
  value?: string | null;
  onChange: (avatarUrl: string | null) => void;
};

export function AvatarUploader({ value, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const preview = useMemo(() => {
    const url = String(value ?? "").trim();
    return url.length > 0 ? url : null;
  }, [value]);

  const onPick = useCallback(async () => {
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
  }, []);

  const onCancelConfirm = useCallback(() => {
    setPendingAsset(null);
  }, []);

  const onConfirmAvatar = useCallback(async () => {
    if (!pendingAsset) return;

    setUploading(true);
    const result = await uploadProfileAvatar({
      uri: pendingAsset.uri,
      fileName: pendingAsset.fileName ?? undefined,
      mimeType: pendingAsset.mimeType ?? undefined,
    });
    setUploading(false);

    if (!result.ok) {
      Alert.alert("Errore", result.errorText ?? "Upload avatar fallito.");
      return;
    }

    const nextAvatarUrl = result.data?.avatar_url ?? null;
    onChange(nextAvatarUrl);
    emit("profile:avatar-updated", { avatarUrl: nextAvatarUrl, at: Date.now() });
    emit("feed:refresh");
    setPendingAsset(null);
  }, [onChange, pendingAsset]);

  return (
    <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>Avatar</Text>
      <Text style={{ color: "#4b5563" }}>Seleziona una foto e conferma dall'anteprima.</Text>
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

      <Modal visible={Boolean(pendingAsset)} transparent animationType="slide" onRequestClose={onCancelConfirm}>
        <View style={{ flex: 1, backgroundColor: "rgba(17, 24, 39, 0.45)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 14, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 30, lineHeight: 34, textAlign: "center", marginBottom: 2 }}>👤</Text>
            <Text style={{ fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 8, color: "#111827" }}>Conferma avatar</Text>
            <Text style={{ color: "#4b5563", textAlign: "center", marginBottom: 12 }}>Controlla l'anteprima prima di confermare l'avatar.</Text>
            <View style={{ alignItems: "center", paddingBottom: 14 }}>
              {pendingAsset?.uri ? (
                <Image source={{ uri: pendingAsset.uri }} style={{ width: 176, height: 176, borderRadius: 88, backgroundColor: "#e5e7eb" }} />
              ) : null}
            </View>

            <View style={{ flexDirection: "row", gap: 10, paddingBottom: Math.max(insets.bottom, 16) + 20 }}>
              <Pressable
                onPress={onCancelConfirm}
                disabled={uploading}
                style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "700", color: "#4b5563" }}>Annulla</Text>
              </Pressable>
              <Pressable
                onPress={() => void onConfirmAvatar()}
                disabled={uploading}
                style={{ flex: 1, borderRadius: 10, backgroundColor: uploading ? "#9ca3af" : "#111827", paddingVertical: 12, alignItems: "center" }}
              >
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontWeight: "700", color: "#fff" }}>Conferma avatar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
