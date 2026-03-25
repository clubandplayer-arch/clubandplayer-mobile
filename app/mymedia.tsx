import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Share,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import LightboxModal from "../components/media/LightboxModal";
import FeedVideoPreview from "../components/feed/FeedVideoPreview";
import { fetchFeedPosts, getWebBaseUrl } from "../src/lib/api";
import { sharePostById } from "../src/lib/sharePost";
import { theme } from "../src/theme";

type MediaTab = "video" | "photo";
type MediaKind = "video" | "image";

type MyMediaItem = {
  id: string;
  media_url: string;
  media_type: MediaKind;
  poster_url: string | null;
  media_aspect: "16:9" | "9:16" | null;
  content: string | null;
  post_id: string | null;
  created_at: string | null;
};

const DEFAULT_LIMIT = 100;

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  try {
    return String(value);
  } catch {
    return null;
  }
}

function normalizeMediaType(raw?: string | null): MediaKind | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "image" || value === "photo") return "image";
  if (value === "video") return "video";
  if (value.startsWith("image/")) return "image";
  if (value.startsWith("video/")) return "video";
  return null;
}

function inferMediaTypeFromUrl(url?: string | null): MediaKind | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (/\.(mp4|mov|avi|mkv)(\?|$)/.test(lower)) return "video";
  if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/.test(lower)) return "image";
  return null;
}

function normalizeAspect(raw?: string | null): "16:9" | "9:16" | null {
  if (!raw) return null;
  const value = raw.trim();
  if (value === "16:9" || value === "16-9") return "16:9";
  if (value === "9:16" || value === "9-16") return "9:16";
  return null;
}

function aspectFromUrl(url?: string | null): "16:9" | "9:16" | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return normalizeAspect(parsed.searchParams.get("aspect"));
  } catch {
    return null;
  }
}

function normalizePostMedia(rawPost: any): MyMediaItem[] {
  const postId = asString(rawPost?.id);
  const postCreatedAt = asString(rawPost?.created_at);
  const postContent = asString(rawPost?.content);

  if (Array.isArray(rawPost?.media)) {
    return rawPost.media
      .map((media: any, index: number) => {
        const mediaUrl = asString(media?.url ?? media?.media_url);
        const mediaType =
          normalizeMediaType(asString(media?.media_type ?? media?.mediaType ?? media?.mime_type)) ??
          inferMediaTypeFromUrl(mediaUrl);

        if (!mediaUrl || !mediaType) return null;

        return {
          id: asString(media?.id) ?? `${postId ?? "post"}-${index}`,
          media_url: mediaUrl,
          media_type: mediaType,
          poster_url: asString(media?.poster_url ?? media?.posterUrl),
          media_aspect:
            normalizeAspect(asString(media?.aspect ?? media?.media_aspect)) ?? aspectFromUrl(mediaUrl),
          content: postContent,
          post_id: postId,
          created_at: postCreatedAt,
        } satisfies MyMediaItem;
      })
      .filter(Boolean) as MyMediaItem[];
  }

  const legacyUrl = asString(rawPost?.media_url);
  const legacyType = normalizeMediaType(asString(rawPost?.media_type)) ?? inferMediaTypeFromUrl(legacyUrl);

  if (!legacyUrl || !legacyType) return [];

  return [
    {
      id: postId ? `${postId}-legacy` : legacyUrl,
      media_url: legacyUrl,
      media_type: legacyType,
      poster_url: asString(rawPost?.poster_url),
      media_aspect: normalizeAspect(asString(rawPost?.media_aspect)) ?? aspectFromUrl(legacyUrl),
      content: postContent,
      post_id: postId,
      created_at: postCreatedAt,
    },
  ];
}

function normalizeFeedPayload(payload: unknown): any[] {
  const root = payload && typeof payload === "object" && "data" in (payload as any) ? (payload as any).data : payload;

  if (Array.isArray((root as any)?.items)) return (root as any).items;
  if (Array.isArray((root as any)?.data?.items)) return (root as any).data.items;
  if (Array.isArray((root as any)?.data)) return (root as any).data;
  if (Array.isArray(root)) return root;
  return [];
}

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function MediaEmptyState({ tab }: { tab: MediaTab }) {
  const isVideo = tab === "video";
  const title = isVideo ? "Nessun video nella tua libreria" : "Nessuna foto nella tua libreria";
  const subtitle = isVideo
    ? "Ogni video pubblicato nel feed verrà mostrato qui."
    : "Ogni foto pubblicata nel feed verrà mostrata qui.";

  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: theme.colors.neutral200,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 28,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: theme.colors.neutral100,
      }}
    >
      <Text style={{ fontSize: 36 }}>{isVideo ? "🎬" : "📷"}</Text>
      <Text style={{ fontSize: 17, fontWeight: "700", textAlign: "center", color: theme.colors.text }}>{title}</Text>
      <Text style={{ fontSize: 13, textAlign: "center", color: theme.colors.muted }}>{subtitle}</Text>
    </View>
  );
}

export default function MyMediaScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialTab: MediaTab = params.type === "photo" ? "photo" : "video";

  const [activeTab, setActiveTab] = useState<MediaTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MyMediaItem[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sharingSection, setSharingSection] = useState(false);
  const [sharingItemId, setSharingItemId] = useState<string | null>(null);

  const loadMedia = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    try {
      const response = await fetchFeedPosts({ mine: true, limit: DEFAULT_LIMIT });
      if (!response.ok) {
        throw new Error(response.errorText || `HTTP ${response.status}`);
      }

      const posts = normalizeFeedPayload(response.data);
      const flattened = posts.flatMap((post: any) => normalizePostMedia(post));

      setMediaItems(flattened);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Errore caricamento media";
      setError(message || "Errore caricamento media");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMedia("initial");
  }, [loadMedia]);

  const videos = useMemo(() => mediaItems.filter((item) => item.media_type === "video"), [mediaItems]);
  const photos = useMemo(() => mediaItems.filter((item) => item.media_type === "image"), [mediaItems]);
  const visibleItems = activeTab === "video" ? videos : photos;

  const lightboxItems = useMemo(
    () => visibleItems.map((item) => ({ url: item.media_url, media_type: item.media_type, poster_url: item.poster_url })),
    [visibleItems]
  );

  const onShareSection = useCallback(async () => {
    if (sharingSection) return;
    setSharingSection(true);
    try {
      const base = getWebBaseUrl();
      const suffix = activeTab === "photo" ? "photo" : "video";
      const sectionUrl = `${base}/mymedia?type=${suffix}#${suffix === "photo" ? "my-photos" : "my-videos"}`;
      await Share.share({ message: sectionUrl });
    } finally {
      setSharingSection(false);
    }
  }, [activeTab, sharingSection]);

  const onShareItem = useCallback(async (item: MyMediaItem) => {
    if (sharingItemId) return;
    setSharingItemId(item.id);
    try {
      if (item.post_id) {
        await sharePostById(item.post_id);
        return;
      }
      await Share.share({ message: item.media_url });
    } finally {
      setSharingItemId(null);
    }
  }, [sharingItemId]);

  return (
    <>
      <Stack.Screen options={{ title: "La mia libreria" }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>La mia libreria</Text>
          <Pressable
            onPress={onShareSection}
            style={{ borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
          >
            <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: "700" }}>
              {sharingSection ? "Condivisione..." : activeTab === "photo" ? "Condividi queste foto" : "Condividi questi video"}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          <Pressable
            onPress={() => setActiveTab("video")}
            style={{
              flex: 1,
              borderRadius: 999,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: activeTab === "video" ? theme.colors.primary : theme.colors.neutral100,
            }}
          >
            <Text style={{ color: activeTab === "video" ? "#fff" : theme.colors.text, fontWeight: "700" }}>Video ({videos.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("photo")}
            style={{
              flex: 1,
              borderRadius: 999,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: activeTab === "photo" ? theme.colors.primary : theme.colors.neutral100,
            }}
          >
            <Text style={{ color: activeTab === "photo" ? "#fff" : theme.colors.text, fontWeight: "700" }}>Foto ({photos.length})</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{error}</Text>
            <Pressable
              onPress={() => void loadMedia("initial")}
              style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}
            >
              <Text style={{ fontWeight: "700" }}>Riprova</Text>
            </Pressable>
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <MediaEmptyState tab={activeTab} />
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadMedia("refresh")} />}
            contentContainerStyle={{ gap: 12, paddingBottom: 28 }}
            renderItem={({ item, index }) => {
              const isVideo = item.media_type === "video";
              const isSharingItem = sharingItemId === item.id;

              return (
                <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.colors.neutral200, overflow: "hidden", backgroundColor: "#fff" }}>
                  <Pressable
                    onPress={() => {
                      setSelectedIndex(index);
                      setLightboxOpen(true);
                    }}
                  >
                    {isVideo ? (
                      <View style={{ position: "relative" }}>
                        <FeedVideoPreview uri={item.media_url} posterUri={item.poster_url} />
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          pointerEvents="none"
                        >
                          <View
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(0,0,0,0.52)",
                            }}
                          >
                            <Text style={{ color: "#fff", fontSize: 24, marginLeft: 2 }}>▶</Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: item.media_url }} style={{ width: "100%", height: 260, backgroundColor: theme.colors.neutral100 }} resizeMode="cover" />
                    )}
                  </Pressable>

                  <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 7 }}>
                    {item.content ? <Text style={{ color: theme.colors.text, fontSize: 14 }}>{item.content}</Text> : null}
                    {item.created_at ? <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{formatWhen(item.created_at)}</Text> : null}

                    <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                      <Pressable
                        onPress={() => void onShareItem(item)}
                        style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text }}>
                          {isSharingItem ? "Condivisione..." : "Condividi"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      <LightboxModal
        visible={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={lightboxItems}
        initialIndex={selectedIndex}
      />
    </>
  );
}
