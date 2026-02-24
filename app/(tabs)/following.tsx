import { Text, View } from "react-native";

import BrandHeader from "../../src/components/brand/BrandHeader";
import { theme } from "../../src/theme";

export default function FollowingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BrandHeader subtitle="Seguiti" />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 24,
          gap: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Seguiti (placeholder)</Text>
        <Text style={{ fontSize: 15, color: theme.colors.muted, textAlign: "center", maxWidth: 280 }}>
          Qui compariranno i club e i player che segui.
        </Text>
      </View>
    </View>
  );
}
