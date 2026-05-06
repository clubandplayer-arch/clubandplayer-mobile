import { ScrollView, Text, View } from "react-native";

import { theme } from "../src/theme";

export default function SponsorScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 24, gap: 12 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: theme.colors.text }}>Sponsor</Text>
        <Text style={{ color: theme.colors.muted }}>
          Questa schermata è il punto di destinazione della CTA “Richiedi info” dal feed.
        </Text>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.neutral50,
          padding: 14,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text }}>Richiedi informazioni</Text>
        <Text style={{ color: theme.colors.muted }}>
          La parity completa con il configuratore sponsor web e il form lead verrà gestita nel flusso dedicato.
        </Text>
      </View>
    </ScrollView>
  );
}
