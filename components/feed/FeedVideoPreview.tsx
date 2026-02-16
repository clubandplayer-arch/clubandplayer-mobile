import { View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

type FeedVideoPreviewProps = {
  uri: string;
  posterUri?: string | null;
};

export default function FeedVideoPreview({ uri, posterUri }: FeedVideoPreviewProps) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.muted = true;
    videoPlayer.pause();
  });

  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 4 / 5,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#111827",
      }}
      pointerEvents="none"
    >
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        nativeControls={false}
        contentFit="contain"
        posterSource={posterUri ? { uri: posterUri } : undefined}
      />
    </View>
  );
}
