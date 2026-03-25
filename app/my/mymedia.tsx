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
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import LightboxModal from "../../components/media/LightboxModal";
import { getWebBaseUrl } from "../../src/lib/api";
import { sharePostById } from "../../src/lib/sharePost";
import { getMyMedia, type MyMediaItem } from "../../src/lib/mymedia/getMyMedia";
import { theme } from "../../src/theme";

type MediaTab = "video" | "photo";

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.neutral200,
        backgroundColor: active ? theme.colors.primary : theme.colors.background,
        borderRadius: 999,
        paddingVertical: 10,
        alignItems: "center",
      }}
    >
      <Text style={{ color: active ? "#fff" : theme.colors.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export default function MyMediaScreen() {
  const [items, setItems] = useState<MyMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MediaTab>("video");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const media = await getMyMedia(60);
      setItems(media);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Errore caricamento media");
      if (!asRefresh) setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const videos = useMemo(() => items.filter((item) => item.media_type === "video"), [items]);
  const photos = useMemo(() => items.filter((item) => item.media_type === "image"), [items]);
  const activeItems = activeTab === "video" ? videos : photos;

  const shareSection = useCallback(async () => {
    const base = getWebBaseUrl();
    const sectionUrl = `${base}/mymedia?tab=${activeTab}`;
    await Share.share({ message: sectionUrl });
  }, [activeTab]);

  const onShareItem = useCallback(async (item: MyMediaItem) => {
    try {
      await sharePostById(item.post_id);
    } catch {
      // Keep UI stable on share failures.
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: "MyMedia" }} />

      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TabButton active={activeTab === "video"} label={`Video (${videos.length})`} onPress={() => setActiveTab("video")} />
          <TabButton active={activeTab === "photo"} label={`Foto (${photos.length})`} onPress={() => setActiveTab("photo")} />
        </View>

        <Pressable
          onPress={shareSection}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            borderRadius: 10,
            paddingVertical: 11,
            paddingHorizontal: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700" }}>Condividi sezione {activeTab === "video" ? "Video" : "Foto"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>Caricamento media…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, gap: 10 }}>
          <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{error}</Text>
          <Pressable
            onPress={() => void load(false)}
            style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}
          >
            <Text style={{ fontWeight: "700" }}>Riprova</Text>
          </Pressable>
        </View>
      ) : activeItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
            {activeTab === "video" ? "Nessun video disponibile." : "Nessuna foto disponibile."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeItems}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
          columnWrapperStyle={{ gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
          renderItem={({ item, index }) => {
            const aspectRatio = item.aspect && item.aspect > 0 ? item.aspect : 1;
            const previewUri = item.media_type === "video" ? item.poster_url || item.url : item.url;

            return (
              <View style={{ flex: 1 / 3, marginBottom: 8, gap: 6 }}>
                <Pressable
                  onPress={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                  style={{ width: "100%", aspectRatio, backgroundColor: theme.colors.neutral100, borderRadius: 8, overflow: "hidden" }}
                >
                  <Image source={{ uri: previewUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  {item.media_type === "video" ? (
                    <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 999, padding: 4 }}>
                      <Ionicons name="play" size={12} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => void onShareItem(item)}
                  style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 8, alignItems: "center", paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700" }}>Condividi</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <LightboxModal
        visible={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={activeItems as any[]}
        initialIndex={lightboxIndex}
      />
    </View>
  );
}
