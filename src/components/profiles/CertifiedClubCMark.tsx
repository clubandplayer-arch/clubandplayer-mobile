import { Text } from "react-native";

import { theme } from "../../theme";

type CertifiedClubCMarkProps = {
  size?: "sm" | "md" | "lg";
  offsetX?: number;
  offsetY?: number;
  color?: string;
};

const FONT_SIZE_BY_SIZE = {
  sm: 12,
  md: 14,
  lg: 20,
} as const;

export default function CertifiedClubCMark({
  size = "md",
  offsetX = -6,
  offsetY = -7,
  color = theme.colors.primary,
}: CertifiedClubCMarkProps) {
  return (
    <Text
      accessible
      accessibilityLabel="Club certificato"
      style={{
        position: "absolute",
        top: offsetY,
        right: offsetX,
        color,
        fontWeight: "700",
        fontSize: FONT_SIZE_BY_SIZE[size],
        fontFamily: theme.fonts.brand,
      }}
    >
      C
    </Text>
  );
}
