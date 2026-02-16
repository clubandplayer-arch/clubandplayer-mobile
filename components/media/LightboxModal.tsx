import { Modal, Pressable, Text, View, Image } from "react-native";
// @ts-ignore expo-video is provided at runtime in target app
import { VideoView, useVideoPlayer } from "expo-video";

type LightboxItem = {
  url?: string | null;
  poster_url?: string | null;
  posterUrl?: string | null;
  media_type?: string | null;
  width?: number | null;
  height?: number | null;
};

type LightboxModalProps = {
  visible: boolean;
  onClose: () => void;
  items: LightboxItem[];
  initialIndex: number;
};

export default function LightboxModal({ visible, onClose, items, initialIndex }: LightboxModalProps) {
  const selectedItem = items[initialIndex] ?? null;
  const mediaType = selectedItem?.media_type?.toLowerCase();
  const mediaUrl = selectedItem?.url ?? null;
  const posterUri = selectedItem?.poster_url || selectedItem?.posterUrl || null;

  const player = useVideoPlayer(mediaUrl ? { uri: mediaUrl } : null, (videoPlayer: any) => {
    videoPlayer.muted = false;
    videoPlayer.pause();
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.92)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: 56,
            right: 20,
            zIndex: 10,
            width: 40,
            height: 40,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(17,24,39,0.8)",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>×</Text>
        </Pressable>

        {mediaUrl ? (
          mediaType === "video" ? (
            <VideoView
              player={player}
              style={{ width: "100%", aspectRatio: 4 / 5, maxHeight: "80%" }}
              nativeControls
              contentFit="contain"
              posterSource={posterUri ? { uri: posterUri } : undefined}
            />
          ) : (
            <Image
              source={{ uri: mediaUrl }}
              style={{ width: "100%", aspectRatio: 4 / 5, maxHeight: "80%" }}
              resizeMode="contain"
            />
          )
        ) : null}
      </View>
    </Modal>
  );
}
