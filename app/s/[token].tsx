import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

function getWebBaseUrl() {
  const base = (process.env.EXPO_PUBLIC_WEB_BASE_URL || "https://www.clubandplayer.com").trim();
  return base.replace(/\/+$/, "");
}

export default function ShareTokenDeepLinkScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const normalizedToken = useMemo(() => (token ?? "").trim(), [token]);
  const webUrl = useMemo(() => {
    const base = getWebBaseUrl();
    return normalizedToken ? `${base}/s/${normalizedToken}` : `${base}/s`;
  }, [normalizedToken]);

  const openInBrowser = async () => {
    // IMPORTANT: do NOT auto-open, otherwise App Links can cause a loop (app -> browser -> app -> ...)
    try {
      await WebBrowser.openBrowserAsync(webUrl);
    } catch {
      // ignore
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Link condiviso</Text>
      <Text style={{ opacity: 0.8, marginBottom: 18 }}>
        Ho aperto l’app dal link. Per evitare un loop con gli App Links, non apro automaticamente il browser.
      </Text>

      <View style={{ gap: 10 }}>
        <Pressable
          onPress={openInBrowser}
          style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 }}
        >
          <Text style={{ fontWeight: "700" }}>Apri il post (browser)</Text>
          <Text style={{ marginTop: 4, opacity: 0.7 }} numberOfLines={1}>
            {webUrl}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/feed")}
          style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, opacity: 0.8 }}
        >
          <Text style={{ fontWeight: "600" }}>Vai alla feed</Text>
        </Pressable>
      </View>
    </View>
  );
}
