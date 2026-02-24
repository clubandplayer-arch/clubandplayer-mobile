import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";

import BrandHeader from "../../../src/components/brand/BrandHeader";
import { theme } from "../../../src/theme";
import {
  getAuthorName,
  getFeedPosts,
  getPostText,
  type FeedPost,
} from "../../../src/lib/feed/getFeedPosts";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function Avatar({ url }: { url: string | null | undefined }) {
  if (!url) {
    return (
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.neutral200,
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.neutral200 }}
    />
  );
}

function FeedCard({ item }: { item: FeedPost }) {
  const authorName = getAuthorName(item.author);
  const text = getPostText(item.raw);
  const when = formatWhen(item.created_at);
  const media = item.media[0] ?? null;

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral200,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
        backgroundColor: theme.colors.background,
      }}
    >
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Avatar url={item.author?.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: theme.colors.text }}>{authorName}</Text>
          {!!when ? <Text style={{ ...theme.typography.small, color: theme.colors.muted }}>{when}</Text> : null}
        </View>
      </View>

      {!!text ? <Text style={{ fontSize: 14, lineHeight: 20, color: theme.colors.text }}>{text}</Text> : null}

      {media?.media_type === "image" && media.url ? (
        <Image
          source={{ uri: media.poster_url || media.url }}
          style={{ width: "100%", aspectRatio: 4 / 5, borderRadius: theme.radius.md }}
          resizeMode="cover"
        />
      ) : null}

      {media?.media_type === "video" ? (
        <View
          style={{
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.neutral200,
            padding: 12,
          }}
        >
          <Text style={{ color: theme.colors.muted }}>Video</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function FeedScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await getFeedPosts({ scope: "all" });
      setItems(response.items);
      setNextPage(response.nextPage);
    } catch {
      setItems([]);
      setNextPage(null);
      setError("Errore nel caricamento del feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
        <ActivityIndicator />
        <Text style={{ color: theme.colors.muted }}>Caricamento feed…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, gap: 10 }}>
        <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Errore nel caricamento del feed</Text>
        <Pressable
          onPress={() => {
            setLoading(true);
            load();
          }}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.primary,
            borderRadius: theme.radius.sm,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard item={item} />}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <BrandHeader subtitle="Feed" />
        </View>
      }
      ListEmptyComponent={
        <View style={{ padding: 20 }}>
          <Text style={{ color: theme.colors.muted }}>Nessun post</Text>
        </View>
      }
      ListFooterComponent={<View style={{ height: nextPage === null ? 16 : 16 }} />}
      style={{ backgroundColor: theme.colors.background }}
    />
  );
}
