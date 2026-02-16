import { View } from "react-native";
// @ts-ignore expo-video is provided at runtime in target app
import { VideoView, useVideoPlayer } from "expo-video";

type FeedVideoPreviewProps = {
  uri: string;
  posterUri?: string | null;
};

export default function FeedVideoPreview({ uri, posterUri }: FeedVideoPreviewProps) {
  const player = useVideoPlayer({ uri }, (videoPlayer: any) => {
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
    >
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        nativeControls={false}
        contentFit="contain"
        posterSource={posterUri ? { uri: posterUri } : undefined}
        pointerEvents="none"
      />
    </View>
  );
}
