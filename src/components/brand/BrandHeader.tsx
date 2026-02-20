import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../../theme";

type BrandHeaderAction = {
  label: string;
  onPress: () => void;
  color?: string;
};

type BrandHeaderProps = {
  subtitle?: string;
  leftAction?: BrandHeaderAction;
  rightAction?: BrandHeaderAction;
};

const ACTION_MIN_WIDTH = 100;

function HeaderAction({ action, align }: { action?: BrandHeaderAction; align: "left" | "right" }) {
  if (!action) return <View style={{ minWidth: ACTION_MIN_WIDTH }} />;

  return (
    <Pressable
      onPress={action.onPress}
      hitSlop={8}
      style={{
        minWidth: ACTION_MIN_WIDTH,
        alignItems: align === "left" ? "flex-start" : "flex-end",
      }}
    >
      <Text style={{ ...theme.typography.strong, color: action.color ?? theme.colors.text }}>
        {action.label}
      </Text>
    </Pressable>
  );
}

export default function BrandHeader({ subtitle, leftAction, rightAction }: BrandHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 24,
        paddingBottom: 12,
        gap: 6,
        backgroundColor: theme.colors.background,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <HeaderAction action={leftAction} align="left" />

        <Text
          style={{
            ...theme.typography.h1,
            color: theme.colors.primary,
            fontFamily: theme.fonts.brand,
            textAlign: "center",
            flex: 1,
          }}
          numberOfLines={1}
        >
          Club & Player
        </Text>

        <HeaderAction action={rightAction} align="right" />
      </View>

      {subtitle ? (
        <Text style={{ ...theme.typography.strong, color: theme.colors.text }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
