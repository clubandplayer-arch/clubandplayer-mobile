import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
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
  const [status, setStatus] = useState<"opening" | "error" | "done">("opening");
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (!normalizedToken) {
      setError("Link non valido (token mancante).");
      setStatus("error");
      return;
    }

    try {
      setError(null);
      setStatus("opening");

      const baseUrl = getWebBaseUrl();
      const url = `${baseUrl}/s/${normalizedToken}`;

      // Open the shared post in an in-app browser (stable, no app-route assumptions).
      const res = await WebBrowser.openBrowserAsync(url);

      // If user closed the browser, bring them to a stable place.
      if (res.type === "dismiss" || res.type === "cancel") {
        setStatus("done");
        router.replace("/feed");
        return;
      }

      // Default fallback
      setStatus("done");
      router.replace("/feed");
    } catch (e) {
      setError("Impossibile aprire il post. Riprova.");
      setStatus("error");
    }
  };

  useEffect(() => {
    // Try once on mount.
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedToken]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      {status === "opening" ? (
        <>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, opacity: 0.8 }}>Apro il post…</Text>
          <Text style={{ marginTop: 6, opacity: 0.55, fontSize: 12 }} numberOfLines={1}>
            token: {normalizedToken || "—"}
          </Text>
        </>
      ) : status === "error" ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Impossibile aprire il link</Text>
          <Text style={{ textAlign: "center", opacity: 0.8, marginBottom: 12 }}>{error}</Text>

          <Pressable
            onPress={open}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderRadius: 10,
              opacity: 0.95,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Riprova</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/feed")}
            style={{
              marginTop: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderRadius: 10,
              opacity: 0.7,
            }}
          >
            <Text>Vai alla feed</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Ok</Text>
          <Text style={{ textAlign: "center", opacity: 0.8 }}>Ti porto alla feed…</Text>
        </>
      )}
    </View>
  );
}
