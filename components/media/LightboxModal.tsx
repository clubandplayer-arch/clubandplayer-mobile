import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, View, Image } from "react-native";
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

type LightboxVideoProps = {
  uri: string;
  posterUri?: string | null;
  visible: boolean;
  closeSignal: number;
};

function LightboxVideo({ uri, posterUri, visible, closeSignal }: LightboxVideoProps) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.muted = false;
    videoPlayer.pause();
  });

  useEffect(() => {
    if (!visible) {
      player.pause();
      if ("currentTime" in player) {
        (player as { currentTime: number }).currentTime = 0;
      }
    }
  }, [visible, player]);

  useEffect(() => {
    player.pause();
    if ("currentTime" in player) {
      (player as { currentTime: number }).currentTime = 0;
    }
  }, [closeSignal, player]);

  return (
    <View style={{ width: "100%", aspectRatio: 4 / 5, maxHeight: "80%", overflow: "hidden" }}>
      {posterUri ? (
        <>
          <Image
            source={{ uri: posterUri }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" }}
            resizeMode="cover"
            blurRadius={20}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          />
        </>
      ) : null}

      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        nativeControls
        fullscreenOptions={{ enable: true }}
        contentFit="contain"
      />
    </View>
  );
}

export default function LightboxModal({ visible, onClose, items, initialIndex }: LightboxModalProps) {
  const [closeSignal, setCloseSignal] = useState(0);
  const selectedItem = items[initialIndex] ?? null;
  const mediaType = selectedItem?.media_type?.toLowerCase();
  const mediaUrl = selectedItem?.url ?? null;
  const posterUri = selectedItem?.poster_url || selectedItem?.posterUrl || null;

  const handleClose = useCallback(() => {
    setCloseSignal((prev) => prev + 1);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
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
          onPress={handleClose}
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
            <LightboxVideo uri={mediaUrl} posterUri={posterUri} visible={visible} closeSignal={closeSignal} />
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
