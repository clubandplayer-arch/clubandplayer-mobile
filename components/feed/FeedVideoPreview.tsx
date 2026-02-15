import { View } from "react-native";
// @ts-ignore expo-av is provided at runtime in target app
import { Video, ResizeMode } from "expo-av";

type FeedVideoPreviewProps = {
  uri: string;
  posterUri?: string | null;
};

export default function FeedVideoPreview({ uri, posterUri }: FeedVideoPreviewProps) {
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
      <Video
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        useNativeControls={false}
        isMuted
        shouldPlay={false}
        resizeMode={ResizeMode.CONTAIN}
        usePoster={Boolean(posterUri)}
        posterSource={posterUri ? { uri: posterUri } : undefined}
      />
    </View>
  );
}
