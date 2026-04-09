import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { fetchProfileMe, fetchWhoami, syncSession } from "../../src/lib/api";
import { supabase } from "../../src/lib/supabase";
import { theme } from "../../src/theme";

async function syncWebSessionAndAudit(session: { access_token: string; refresh_token: string }) {
  const syncRes = await syncSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (__DEV__) {
    console.log("[auth/callback][syncSession]", {
      ok: syncRes.ok,
      status: syncRes.status,
      errorText: syncRes.ok ? null : syncRes.errorText ?? null,
    });
  }

  const whoamiRes = await fetchWhoami();
  if (__DEV__) {
    console.log("[auth/callback][whoami]", {
      ok: whoamiRes.ok,
      status: whoamiRes.status,
      role: whoamiRes.ok ? whoamiRes.data?.role ?? null : null,
      errorText: whoamiRes.ok ? null : whoamiRes.errorText ?? null,
    });
  }

  const profileRes = await fetchProfileMe();
  if (__DEV__) {
    console.log("[auth/callback][profiles/me]", {
      ok: profileRes.ok,
      status: profileRes.status,
      errorText: profileRes.ok ? null : profileRes.errorText ?? null,
    });
  }
}

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const handledRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // If session already exists (e.g. exchange done in src/lib/auth.ts),
    // move on even if no URL is delivered to this screen.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      if (!data.session || handledRef.current) return;

      handledRef.current = true;
      await syncWebSessionAndAudit({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      router.replace("/");
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted || !session || handledRef.current) return;

      handledRef.current = true;
      await syncWebSessionAndAudit({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      router.replace("/");
    });

    const timeoutId = setTimeout(() => {
      if (isMounted && !handledRef.current) {
        setError("Login non completato, riprova");
      }
    }, 20000);

    const handleUrl = async (url: string | null) => {
      if (!url || handledRef.current) return;

      if (url.includes("expo-development-client")) return;
      if (!url.includes("/auth/callback")) return;

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

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        if (isMounted) setError("Sessione Supabase mancante dopo exchange");
        handledRef.current = false;
        return;
      }

      await syncWebSessionAndAudit({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (isMounted) router.replace("/");
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
              backgroundColor: theme.colors.text,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: theme.colors.background, fontWeight: "600" }}>Riprova</Text>
          </Pressable>

          <Pressable
            onPress={handleBackToLogin}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.muted,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
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
