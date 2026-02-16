import { Image, View } from "react-native";
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
    >
      {posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Il parent gestisce il tap (apre lightbox). Qui disabilitiamo solo l'interazione sul video */}
      <View pointerEvents="none" style={{ width: "100%", height: "100%" }}>
        <VideoView
          player={player}
          style={{ width: "100%", height: "100%" }}
          nativeControls={false}
          contentFit="contain"
        />
      </View>
    </View>
  );
}
