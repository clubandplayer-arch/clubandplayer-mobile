import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Linking from "expo-linking";

const MAX_EVENTS = 3;

const formatUrl = (url: string | null) => (url ? url : "none");

export default function DebugDeeplink() {
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [eventUrls, setEventUrls] = useState<string[]>([]);

  const addEventUrl = useCallback((url: string) => {
    setEventUrls((prev) => [url, ...prev].slice(0, MAX_EVENTS));
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      setInitialUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      addEventUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [addEventUrl]);

  const handleTestOpen = useCallback(() => {
    Linking.openURL("clubandplayer://callback?code=test123");
  }, []);

  const recentEvents = useMemo(() => {
    if (eventUrls.length === 0) {
      return ["none"];
    }
    return eventUrls;
  }, [eventUrls]);

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        gap: 16,
        backgroundColor: "#ffffff",
      }}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>
          Debug Deep Link
        </Text>
        <Text>getInitialURL(): {formatUrl(initialUrl)}</Text>
        <Text>Ultimi eventi Linking:</Text>
        <View style={{ gap: 4 }}>
          {recentEvents.map((url, index) => (
            <Text key={`${url}-${index}`}>
              {index + 1}. {url}
            </Text>
          ))}
        </View>
      </View>

      <Pressable
        onPress={handleTestOpen}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: "#111827",
          borderRadius: 8,
          alignSelf: "flex-start",
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "600" }}>
          Test apri deep link
        </Text>
      </Pressable>
    </ScrollView>
  );
}
