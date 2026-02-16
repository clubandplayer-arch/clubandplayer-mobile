import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
// @ts-ignore expo-image-picker types vary between SDK releases
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";

import { supabase } from "../../src/lib/supabase";
import { createFeedPost, fetchLinkPreview } from "../../src/lib/api";

type LinkPreview = {
  url?: string | null;
  title?: string | null;
  description?: string | null;
  image?: string | null;
};

type DraftMedia = {
  uri: string;
  mediaType: "image" | "video";
  width: number;
  height: number;
  fileName: string;
  mimeType: string;
  posterUri?: string;
  posterWidth?: number;
  posterHeight?: number;
};

type FeedComposerProps = {
  onPosted?: () => void;
};

function findFirstUrl(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s]+/i);
  return match?.[0] ?? null;
}

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned || "file";
}

function inferContentType(fileName: string, mediaType: "image" | "video") {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
  };
  return map[ext] ?? (mediaType === "video" ? "video/mp4" : "image/jpeg");
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return "";
      }
    });
}

async function readBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const str = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  let out = "";
  let i = 0;

  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    out += String.fromCharCode(chr1);
    if (enc3 !== 64) out += String.fromCharCode(chr2);
    if (enc4 !== 64) out += String.fromCharCode(chr3);
  }

  const bytes = new Uint8Array(out.length);
  for (let idx = 0; idx < out.length; idx += 1) {
    bytes[idx] = out.charCodeAt(idx);
  }
  return bytes;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

async function generateVideoPoster(uri: string) {
  const result = await VideoThumbnails.getThumbnailAsync(uri, {
    time: 500,
  });

  const size = await getImageSize(result.uri);
  return { uri: result.uri, width: size.width, height: size.height };
}

function buildPosterFileName(fileName: string): string {
  const cleanName = sanitizeFileName(fileName);
  const dotIndex = cleanName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? cleanName.slice(0, dotIndex) : cleanName;
  return `${baseName}-poster.jpg`;
}

async function pickAsset(type: "image" | "video"): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permesso galleria non concesso");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: type === "image" ? ["images"] : ["videos"],
    quality: 0.9,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

export default function FeedComposer({ onPosted }: FeedComposerProps) {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const firstUrl = useMemo(() => findFirstUrl(content), [content]);

  useEffect(() => {
    let active = true;

    if (!firstUrl) {
      setLinkPreview(null);
      return;
    }

    (async () => {
      try {
        setPreviewLoading(true);
        const res = await fetchLinkPreview(firstUrl);
        if (!active) return;
        if (res.ok) {
          setLinkPreview({
            url: res.url ? decodeHtmlEntities(res.url) : null,
            title: res.title ? decodeHtmlEntities(res.title) : null,
            description: res.description ? decodeHtmlEntities(res.description) : null,
            image: res.image ? decodeHtmlEntities(res.image) : null,
          });
        } else {
          setLinkPreview(null);
        }
      } catch {
        if (active) setLinkPreview(null);
      } finally {
        if (active) setPreviewLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [firstUrl]);

  const onPickImage = useCallback(async () => {
    try {
      const asset = await pickAsset("image");
      if (!asset) return;
      const imageSize = await getImageSize(asset.uri);
      const fileName = sanitizeFileName(asset.fileName ?? `image-${Date.now()}.jpg`);
      const mimeType = asset.mimeType ?? inferContentType(fileName, "image");

      setMedia((prev) => [
        ...prev,
        {
          uri: asset.uri,
          mediaType: "image",
          width: imageSize.width,
          height: imageSize.height,
          fileName,
          mimeType,
        },
      ]);
    } catch (error: any) {
      Alert.alert("Errore", error?.message ? String(error.message) : "Impossibile selezionare la foto");
    }
  }, []);

  const onPickVideo = useCallback(async () => {
    try {
      const asset = await pickAsset("video");
      if (!asset) return;

      const fileName = sanitizeFileName(asset.fileName ?? `video-${Date.now()}.mp4`);
      const mimeType = asset.mimeType ?? inferContentType(fileName, "video");
      let poster: { uri: string; width: number; height: number } | null = null;
      try {
        poster = await generateVideoPoster(asset.uri);
      } catch {
        poster = null;
      }

      setMedia((prev) => [
        ...prev,
        {
          uri: asset.uri,
          mediaType: "video",
          width:
            typeof asset.width === "number"
              ? asset.width
              : (poster?.width ?? 0),
          height:
            typeof asset.height === "number"
              ? asset.height
              : (poster?.height ?? 0),
          fileName,
          mimeType,
          posterUri: poster?.uri,
          posterWidth: poster?.width,
          posterHeight: poster?.height,
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Errore",
        error?.message ? String(error.message) : "Impossibile selezionare il video",
      );
    }
  }, []);

  const onPublish = useCallback(async () => {
    if (publishing) return;
    if (!content.trim() && media.length === 0) {
      Alert.alert("Contenuto mancante", "Inserisci testo o almeno un allegato.");
      return;
    }

    try {
      setPublishing(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Sessione non valida. Effettua di nuovo il login.");
      }

      const bucket = process.env.EXPO_PUBLIC_POSTS_BUCKET ?? "posts";
      const uploadedMedia = [] as Array<{
        mediaType: "image" | "video";
        url: string;
        posterUrl: string | null;
        width: number;
        height: number;
        position: number;
      }>;

      for (let index = 0; index < media.length; index += 1) {
        const item = media[index];
        const mediaPath = `${user.id}/${Date.now()}-${sanitizeFileName(item.fileName)}`;
        const bytes = await readBytes(item.uri);

        const uploadRes = await supabase.storage.from(bucket).upload(mediaPath, bytes, {
          contentType: item.mimeType,
          upsert: false,
        });

        if (uploadRes.error) {
          throw new Error(uploadRes.error.message || "Upload media fallito");
        }

        const mediaUrl = supabase.storage.from(bucket).getPublicUrl(mediaPath).data.publicUrl;

        let posterUrl: string | null = null;
        if (item.mediaType === "video" && item.posterUri) {
          const posterFileName = buildPosterFileName(item.fileName);
          const posterPath = `${user.id}/posters/${Date.now()}-${posterFileName}`;

          try {
            const posterBytes = await readBytes(item.posterUri);
            const posterUpload = await supabase.storage.from(bucket).upload(posterPath, posterBytes, {
              contentType: "image/jpeg",
              upsert: false,
            });

            if (!posterUpload.error) {
              posterUrl = supabase.storage.from(bucket).getPublicUrl(posterPath).data.publicUrl;
            }
          } catch {
            posterUrl = null;
          }
        }

        const w = typeof item.width === "number" && item.width > 0 ? item.width : (item.posterWidth ?? 0);
		    const h = typeof item.height === "number" && item.height > 0 ? item.height : (item.posterHeight ?? 0);

		    if (item.mediaType === "video" && (w <= 0 || h <= 0)) {
		    throw new Error("Dimensioni video non disponibili");
		    }

        uploadedMedia.push({
          mediaType: item.mediaType,
          url: mediaUrl,
          posterUrl,
          width: w,
          height: h,
          position: index,
        });
      }

      const payload: any = {
        content: content.trim(),
        media: uploadedMedia,
      };

      if (linkPreview?.url) {
        payload.link_url = String(linkPreview.url);
        if (linkPreview.title) payload.link_title = String(linkPreview.title).slice(0, 500);
        if (linkPreview.description) {
          payload.link_description = String(linkPreview.description).slice(0, 2000);
        }
        if (linkPreview.image) payload.link_image = String(linkPreview.image);
      }

      const result = await createFeedPost(payload);
      if (!result.ok) {
        const errorResult = result as { ok: false; message?: string };
        throw new Error(errorResult.message || "Pubblicazione non riuscita");
      }

      setContent("");
      setMedia([]);
      setLinkPreview(null);
      onPosted?.();
    } catch (error: any) {
      Alert.alert("Errore", error?.message ? String(error.message) : "Pubblicazione non riuscita");
    } finally {
      setPublishing(false);
    }
  }, [content, linkPreview, media, onPosted, publishing]);

  return (
    <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 14, gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Post</Text>

      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        editable={!publishing}
        placeholder="Scrivi qualcosa…"
        style={{
          minHeight: 92,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 10,
          padding: 10,
          textAlignVertical: "top",
          color: "#111827",
        }}
      />

      {media.map((item, index) => (
        <View key={`${item.uri}-${index}`} style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
          <Image
            source={{ uri: item.mediaType === "video" ? item.posterUri || item.uri : item.uri }}
            style={{ width: "100%", height: 160 }}
            resizeMode="cover"
          />
          <View style={{ padding: 8, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#6b7280", fontSize: 12 }}>
              {item.mediaType === "video" ? "🎬 Video" : "🖼️ Foto"}
            </Text>
            <Pressable
              disabled={publishing}
              onPress={() => setMedia((prev) => prev.filter((_, i) => i !== index))}
            >
              <Text style={{ color: "#b91c1c", fontWeight: "700" }}>Rimuovi</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {previewLoading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: "#6b7280" }}>Carico anteprima link…</Text>
        </View>
      ) : linkPreview ? (
        <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          {linkPreview.image ? (
            <Image source={{ uri: linkPreview.image }} style={{ width: "100%", height: 120 }} resizeMode="cover" />
          ) : null}
          <View style={{ padding: 10, gap: 4 }}>
            {linkPreview.title ? <Text style={{ color: "#111827", fontWeight: "700" }}>{linkPreview.title}</Text> : null}
            {linkPreview.description ? <Text style={{ color: "#6b7280" }}>{linkPreview.description}</Text> : null}
            {linkPreview.url ? <Text style={{ color: "#036f9a" }}>{linkPreview.url}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onPickImage}
          disabled={publishing}
          style={{ borderWidth: 1, borderColor: "#111827", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}
        >
          <Text style={{ color: "#111827", fontWeight: "700" }}>Foto</Text>
        </Pressable>

        <Pressable
          onPress={onPickVideo}
          disabled={publishing}
          style={{ borderWidth: 1, borderColor: "#111827", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}
        >
          <Text style={{ color: "#111827", fontWeight: "700" }}>Video</Text>
        </Pressable>

        <Pressable
          onPress={onPublish}
          disabled={publishing}
          style={{
            backgroundColor: "#111827",
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            opacity: publishing ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>{publishing ? "Pubblico…" : "Pubblica"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
