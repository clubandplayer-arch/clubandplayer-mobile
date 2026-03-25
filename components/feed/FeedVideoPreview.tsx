import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";

type FeedVideoPreviewProps = {
  uri: string;
  posterUri?: string | null;
};

const generatedThumbCache = new Map<string, string>();

export default function FeedVideoPreview({ uri, posterUri }: FeedVideoPreviewProps) {
  const [generatedPosterUri, setGeneratedPosterUri] = useState<string | null>(() => {
    const cached = generatedThumbCache.get(uri);
    return cached ?? null;
  });

  useEffect(() => {
    let cancelled = false;

    if (posterUri) {
      setGeneratedPosterUri(null);
      return;
    }

    const cached = generatedThumbCache.get(uri);
    if (cached) {
      setGeneratedPosterUri(cached);
      return;
    }

    (async () => {
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: 1200,
        });
        if (cancelled || !thumbUri) return;
        generatedThumbCache.set(uri, thumbUri);
        setGeneratedPosterUri(thumbUri);
      } catch {
        if (!cancelled) setGeneratedPosterUri(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, posterUri]);

  const effectivePosterUri = posterUri ?? generatedPosterUri;

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
      {effectivePosterUri ? (
        <Image source={{ uri: effectivePosterUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : null}
    </View>
  );
}
