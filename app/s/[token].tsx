import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type ShareLinksResponse =
  | { ok: true; post: { id: string } }
  | { ok: false; message?: string };

function getWebBaseUrl() {
  const base = (process.env.EXPO_PUBLIC_WEB_BASE_URL || "https://www.clubandplayer.com").trim();
  return base.replace(/\/+$/, "");
}

export default function ShareTokenDeepLinkScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const normalizedToken = useMemo(() => (token ?? "").trim(), [token]);

  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [error, setError] = useState<string>("");

  const run = async () => {
    if (!normalizedToken) {
      setStatus("error");
      setError("Link non valido (token mancante).");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const baseUrl = getWebBaseUrl();
      const res = await fetch(`${baseUrl}/api/share-links/${normalizedToken}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        // Avoid any caching weirdness
        cache: "no-store" as any,
      });

      const data = (await res.json().catch(() => null)) as ShareLinksResponse | null;

      if (!res.ok || !data || (data as any).ok !== true) {
        setStatus("error");
        setError((data as any)?.message ?? "Link non valido o scaduto.");
        return;
      }

      const postId = (data as any).post?.id as string | undefined;
      if (!postId) {
        setStatus("error");
        setError("Post non trovato.");
        return;
      }

      // ✅ Navigate to the real post detail route
      router.replace(`/posts/${postId}`);
    } catch {
      setStatus("error");
      setError("Errore temporaneo. Riprova.");
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedToken]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      {status === "loading" ? (
        <>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, opacity: 0.8 }}>Apro il post…</Text>
          <Text style={{ marginTop: 6, opacity: 0.55, fontSize: 12 }} numberOfLines={1}>
            token: {normalizedToken || "—"}
          </Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 6 }}>Impossibile aprire il link</Text>
          <Text style={{ textAlign: "center", opacity: 0.8, marginBottom: 14 }}>{error}</Text>

          <Pressable
            onPress={run}
            style={{ paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 10 }}
          >
            <Text style={{ fontWeight: "700" }}>Riprova</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/feed")}
            style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 10, opacity: 0.8 }}
          >
            <Text>Vai alla feed</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
