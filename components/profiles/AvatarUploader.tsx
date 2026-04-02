import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SaveFormat, manipulateAsync } from "expo-image-manipulator";
import { uploadProfileAvatar } from "../../src/lib/api";
import { emit } from "../../src/lib/events/appEvents";

type Props = {
  value?: string | null;
  onChange: (avatarUrl: string | null) => void;
};

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
};

const screenWidth = Dimensions.get("window").width;
const cropSize = Math.min(screenWidth - 48, 320);
const MAX_ZOOM_FACTOR = 3;
const ZOOM_STEP = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCoverScale(width: number, height: number): number {
  return Math.max(cropSize / width, cropSize / height);
}

function getBounds(width: number, height: number, scale: number) {
  return {
    minX: cropSize - width * scale,
    maxX: 0,
    minY: cropSize - height * scale,
    maxY: 0,
  };
}

function centerOffset(length: number, scale: number): number {
  return (cropSize - length * scale) / 2;
}

export function AvatarUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const scaleRef = useRef(scale);
  const translateXRef = useRef(translateX);
  const translateYRef = useRef(translateY);

  const preview = useMemo(() => {
    const url = String(value ?? "").trim();
    return url.length > 0 ? url : null;
  }, [value]);

  const syncTransform = useCallback((nextScale: number, nextX: number, nextY: number) => {
    scaleRef.current = nextScale;
    translateXRef.current = nextX;
    translateYRef.current = nextY;
    setScale(nextScale);
    setTranslateX(nextX);
    setTranslateY(nextY);
  }, []);

  const resetEditorState = useCallback((image: SelectedImage) => {
    const minScale = getCoverScale(image.width, image.height);
    syncTransform(minScale, centerOffset(image.width, minScale), centerOffset(image.height, minScale));
  }, [syncTransform]);

  const closeEditor = useCallback(() => {
    setEditorVisible(false);
    setSelectedImage(null);
  }, []);

  const onPick = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permesso richiesto", "Consenti accesso alle foto per cambiare avatar.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false,
    });

    if (picked.canceled || !picked.assets?.length) return;
    const asset = picked.assets[0];
    if (!asset.width || !asset.height) {
      Alert.alert("Errore", "Immagine non valida. Riprova con una foto diversa.");
      return;
    }

    const image: SelectedImage = {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName ?? null,
      mimeType: asset.mimeType ?? null,
    };
    setSelectedImage(image);
    resetEditorState(image);
    setEditorVisible(true);
  }, [resetEditorState]);

  const changeZoom = useCallback((direction: "in" | "out") => {
    if (!selectedImage) return;
    const minScale = getCoverScale(selectedImage.width, selectedImage.height);
    const maxScale = minScale * MAX_ZOOM_FACTOR;
    const nextScale = clamp(
      scaleRef.current + (direction === "in" ? ZOOM_STEP : -ZOOM_STEP),
      minScale,
      maxScale,
    );

    const centerX = cropSize / 2;
    const centerY = cropSize / 2;
    const focusImageX = (centerX - translateXRef.current) / scaleRef.current;
    const focusImageY = (centerY - translateYRef.current) / scaleRef.current;

    const tentativeX = centerX - focusImageX * nextScale;
    const tentativeY = centerY - focusImageY * nextScale;
    const bounds = getBounds(selectedImage.width, selectedImage.height, nextScale);

    syncTransform(
      nextScale,
      clamp(tentativeX, bounds.minX, bounds.maxX),
      clamp(tentativeY, bounds.minY, bounds.maxY),
    );
  }, [selectedImage, syncTransform]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !!selectedImage,
        onMoveShouldSetPanResponder: () => !!selectedImage,
        onPanResponderMove: (_evt, gesture) => {
          if (!selectedImage) return;
          const bounds = getBounds(selectedImage.width, selectedImage.height, scaleRef.current);
          const nextX = clamp(translateXRef.current + gesture.dx, bounds.minX, bounds.maxX);
          const nextY = clamp(translateYRef.current + gesture.dy, bounds.minY, bounds.maxY);
          setTranslateX(nextX);
          setTranslateY(nextY);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (!selectedImage) return;
          const bounds = getBounds(selectedImage.width, selectedImage.height, scaleRef.current);
          const nextX = clamp(translateXRef.current + gesture.dx, bounds.minX, bounds.maxX);
          const nextY = clamp(translateYRef.current + gesture.dy, bounds.minY, bounds.maxY);
          translateXRef.current = nextX;
          translateYRef.current = nextY;
          setTranslateX(nextX);
          setTranslateY(nextY);
        },
      }),
    [selectedImage],
  );

  const onConfirm = useCallback(async () => {
    if (!selectedImage) return;

    const currentScale = scaleRef.current;
    const currentX = translateXRef.current;
    const currentY = translateYRef.current;

    const originX = clamp(Math.round(-currentX / currentScale), 0, selectedImage.width - 1);
    const originY = clamp(Math.round(-currentY / currentScale), 0, selectedImage.height - 1);
    const cropWidth = Math.max(
      1,
      Math.min(selectedImage.width - originX, Math.round(cropSize / currentScale)),
    );
    const cropHeight = Math.max(
      1,
      Math.min(selectedImage.height - originY, Math.round(cropSize / currentScale)),
    );

    setUploading(true);

    try {
      const cropped = await manipulateAsync(
        selectedImage.uri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropWidth,
              height: cropHeight,
            },
          },
          {
            resize: {
              width: 512,
              height: 512,
            },
          },
        ],
        {
          compress: 0.85,
          format: SaveFormat.JPEG,
        },
      );

      const result = await uploadProfileAvatar({
        uri: cropped.uri,
        fileName: selectedImage.fileName ?? `avatar-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      });

      if (!result.ok) {
        Alert.alert("Errore", result.errorText ?? "Upload avatar fallito.");
        return;
      }

      const nextAvatarUrl = result.data?.avatar_url ?? null;
      onChange(nextAvatarUrl);
      emit("app:profile-avatar-updated", { avatarUrl: nextAvatarUrl });
      closeEditor();
    } catch {
      Alert.alert("Errore", "Non siamo riusciti a ritagliare la foto. Riprova.");
    } finally {
      setUploading(false);
    }
  }, [closeEditor, onChange, selectedImage]);

  const minScale = selectedImage ? getCoverScale(selectedImage.width, selectedImage.height) : 1;
  const maxScale = minScale * MAX_ZOOM_FACTOR;

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

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={closeEditor}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(17,24,39,0.9)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            gap: 16,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Ritaglia avatar</Text>
          <Text style={{ color: "#d1d5db", textAlign: "center" }}>
            Sposta e zooma la foto. L'upload parte solo quando confermi.
          </Text>

          <View
            style={{
              width: cropSize,
              height: cropSize,
              borderRadius: cropSize / 2,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "#fff",
              backgroundColor: "#111827",
            }}
            {...panResponder.panHandlers}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={{
                  position: "absolute",
                  width: selectedImage.width * scale,
                  height: selectedImage.height * scale,
                  left: translateX,
                  top: translateY,
                }}
              />
            ) : null}
          </View>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Pressable
              onPress={() => changeZoom("out")}
              style={{ backgroundColor: "#374151", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
              disabled={!selectedImage || uploading || scale <= minScale + 0.01}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>−</Text>
            </Pressable>
            <Text style={{ color: "#e5e7eb", minWidth: 80, textAlign: "center" }}>
              Zoom {Math.round((scale / minScale) * 100)}%
            </Text>
            <Pressable
              onPress={() => changeZoom("in")}
              style={{ backgroundColor: "#374151", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
              disabled={!selectedImage || uploading || scale >= maxScale - 0.01}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>+</Text>
            </Pressable>
          </View>

          <View style={{ width: "100%", flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={closeEditor}
              style={{ flex: 1, backgroundColor: "#374151", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
              disabled={uploading}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Annulla</Text>
            </Pressable>
            <Pressable
              onPress={() => void onConfirm()}
              style={{ flex: 1, backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
              disabled={!selectedImage || uploading}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Conferma</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
