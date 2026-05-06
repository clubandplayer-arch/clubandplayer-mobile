import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { theme } from "../src/theme";

export default function SponsorRedirectScreen() {
  useEffect(() => {
    void WebBrowser.openBrowserAsync("https://www.clubandplayer.com/sponsor");
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 24,
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator />
      <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
        Reindirizzamento alla pagina sponsor…
      </Text>
    </View>
  );
}
