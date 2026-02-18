import { Image, View } from "react-native";

const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://clubandplayer-app.vercel.app";

const LOGO_URI = `${WEB_BASE_URL}/brand/logo-wide.png`;

type BrandLogoProps = {
  width?: number;
  height?: number;
};

export function BrandLogo({ width = 220, height = 56 }: BrandLogoProps) {
  return (
    <View style={{ alignItems: "center" }}>
      <Image
        source={{ uri: LOGO_URI }}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Club & Player"
      />
    </View>
  );
}
