import { Text, View } from "react-native";

import BrandHeader from "../../../src/components/brand/BrandHeader";
import { theme } from "../../../src/theme";

export default function ClubRosterPlaceholderScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <BrandHeader subtitle="Rosa" />
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        <Text style={{ color: theme.colors.text }}>ROSA: in arrivo (PR-ROSA.2)</Text>
      </View>
    </View>
  );
}
