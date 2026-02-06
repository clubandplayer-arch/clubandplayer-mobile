import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../src/lib/supabase";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const handledRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // If session already exists (e.g. exchange done in src/lib/auth.ts),
    // move on even if no URL is delivered to this screen.
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) router.replace("/(tabs)/feed");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session) router.replace("/(tabs)/feed");
    });

    const timeoutId = setTimeout(() => {
      if (isMounted && !handledRef.current) {
        setError("Login non completato, riprova");
      }
    }, 20000);

    const handleUrl = async (url: string | null) => {
      if (!url || handledRef.current) return;

      if (url.includes("expo-development-client")) return;
      if (!url.includes("/callback") && !url.includes("/auth/callback")) return;

      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code;

      if (typeof code !== "string") {
        if (isMounted) setError("OAuth code mancante");
        return;
      }

      handledRef.current = true;

      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError && isMounted) {
        setError(String(exchangeError));
        handledRef.current = false;
        return;
      }

      if (isMounted) router.replace("/(tabs)/feed");
    };

    Linking.getInitialURL().then((url) => {
      if (url) setLastUrl(url);
      handleUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      setLastUrl(url);
      handleUrl(url);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.remove();
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const handleRetry = () => {
    handledRef.current = false;
    setError(null);
    router.replace("/(auth)/login");
  };

  const handleBackToLogin = () => {
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {error ? (
        <View style={{ alignItems: "center", gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ textAlign: "center" }}>{error}</Text>
          <Text style={{ textAlign: "center" }}>
            URL ricevuto: {lastUrl ? lastUrl.slice(0, 160) : "none"}
          </Text>

          <Pressable
            onPress={handleRetry}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: "#111827",
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>Riprova</Text>
          </Pressable>

          <Pressable
            onPress={handleBackToLogin}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#9ca3af",
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "600" }}>
              Torna al login
            </Text>
          </Pressable>
        </View>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}
