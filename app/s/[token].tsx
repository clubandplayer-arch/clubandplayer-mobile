import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!normalizedToken) {
        setError("Link non valido.");
        return;
      }

      try {
        const baseUrl = getWebBaseUrl();
        const url = `${baseUrl}/s/${normalizedToken}`;

        // Open the shared post in an in-app browser.
        // This avoids route mismatch/auth redirects that cause the "bounce to feed".
        await WebBrowser.openBrowserAsync(url);

        if (cancelled) return;

        // After closing the browser, go to a stable default.
        router.replace("/feed");
      } catch {
        if (cancelled) return;
        setError("Errore temporaneo. Riprova.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [normalizedToken, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      {error ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Impossibile aprire il link</Text>
          <Text style={{ textAlign: "center", opacity: 0.8 }}>{error}</Text>
        </>
      ) : (
        <>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, opacity: 0.8 }}>Apro il post…</Text>
        </>
      )}
    </View>
  );
}
