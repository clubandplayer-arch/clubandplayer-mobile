import { Image, Modal, Pressable, Text, View } from "react-native";
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

  // Nota: manteniamo l'hook incondizionale (regola hooks).
  // Usiamo uri non vuota SOLO quando mediaUrl è presente; altrimenti mettiamo un uri "safe".
  // In UI, il VideoView viene renderizzato solo se mediaType === "video" e mediaUrl esiste.
  const player = useVideoPlayer(mediaUrl ? { uri: mediaUrl } : { uri: "about:blank" }, (videoPlayer) => {
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
            <View style={{ width: "100%", aspectRatio: 4 / 5, maxHeight: "80%" }}>
              {posterUri ? (
                <Image
                  source={{ uri: posterUri }}
                  style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
                  resizeMode="cover"
                />
              ) : null}

              <VideoView
                player={player}
                style={{ width: "100%", height: "100%" }}
                nativeControls
                contentFit="contain"
              />
            </View>
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
