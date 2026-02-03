import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../src/lib/supabase";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted && !handledRef.current) {
        setError("Login non completato, riprova");
      }
    }, 18000);

    const handleUrl = async (url: string | null) => {
      if (!url || handledRef.current) return;

      if (__DEV__) {
        console.log("OAuth callback URL ricevuto:", url);
      }

      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code;

      if (typeof code !== "string") {
        if (isMounted) {
          setError("OAuth code mancante");
        }
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

      if (isMounted) {
        router.replace("/(tabs)/feed");
      }
    };

    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.remove();
    };
  }, [router]);

  const handleRetry = () => {
    handledRef.current = false;
    setError(null);
    router.replace("/(auth)/signup");
  };

  const handleBackToLogin = () => {
    router.replace("/(auth)/signup");
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {error ? (
        <View style={{ alignItems: "center", gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ textAlign: "center" }}>{error}</Text>
          <Pressable
            onPress={handleRetry}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: "#111827",
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>
              Riprova
            </Text>
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
