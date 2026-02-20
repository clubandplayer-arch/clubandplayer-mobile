import { Text, View } from "react-native";

import { theme } from "../../theme";

type BrandHeaderProps = {
  subtitle?: string;
};

export default function BrandHeader({ subtitle }: BrandHeaderProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          ...theme.typography.h1,
          color: theme.colors.primary,
          fontFamily: theme.fonts.brand,
        }}
      >
        Club & Player
      </Text>

      {subtitle ? (
        <Text style={{ ...theme.typography.strong, color: theme.colors.text }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
