import { Image, View } from "react-native";

type FeedVideoPreviewProps = {
  uri: string;
  posterUri?: string | null;
};

export default function FeedVideoPreview({ posterUri }: FeedVideoPreviewProps) {
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 4 / 5,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#111827",
      }}
    >
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : null}
    </View>
  );
}
