import { Image, Pressable, Text, View } from "react-native";

import { theme } from "../../theme";
import type { SearchItem } from "../../lib/api";

const KIND_LABELS: Record<SearchItem["kind"], string> = {
  opportunities: "Opportunità",
  clubs: "Club",
  players: "Player",
  posts: "Post",
  events: "Eventi",
};

const KIND_STYLES: Record<SearchItem["kind"], { backgroundColor: string; borderColor: string; color: string }> = {
  opportunities: { backgroundColor: "#fffbeb", borderColor: "#fde68a", color: "#b45309" },
  clubs: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" },
  players: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#047857" },
  posts: { backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#475569" },
  events: { backgroundColor: "#faf5ff", borderColor: "#d8b4fe", color: "#7e22ce" },
};

function Avatar({ result }: { result: SearchItem }) {
  const safeUrl = result.image_url && result.image_url.trim() ? result.image_url.trim() : null;
  const initial = result.title?.trim()?.[0]?.toUpperCase() || "S";

  if (safeUrl) {
    return (
      <Image
        source={{ uri: safeUrl }}
        style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: theme.colors.neutral200 }}
      />
    );
  }

  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.neutral200,
      }}
    >
      <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>{initial}</Text>
    </View>
  );
}

export default function SearchResultRow({ result, onPress }: { result: SearchItem; onPress: (item: SearchItem) => void }) {
  const kindStyle = KIND_STYLES[result.kind];

  return (
    <Pressable
      onPress={() => onPress(result)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 14,
        backgroundColor: theme.colors.background,
        padding: 12,
      }}
    >
      <Avatar result={result} />

      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "700", flexShrink: 1 }}>{result.title}</Text>
          <View
            style={{
              borderRadius: 999,
              borderWidth: 1,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: kindStyle.backgroundColor,
              borderColor: kindStyle.borderColor,
            }}
          >
            <Text style={{ color: kindStyle.color, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
              {KIND_LABELS[result.kind]}
            </Text>
          </View>
        </View>

        {result.subtitle ? <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{result.subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}
