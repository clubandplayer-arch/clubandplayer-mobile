import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type ShareLinksResponse =
  | { ok: true; post: { id: string } }
  | { ok: false; message?: string };

function getWebBaseUrl() {
  const base =
    process.env.EXPO_PUBLIC_WEB_BASE_URL ||
    process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() ||
    "https://www.clubandplayer.com";
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
        const res = await fetch(`${baseUrl}/api/share-links/${normalizedToken}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const data = (await res.json().catch(() => null)) as ShareLinksResponse | null;

        if (cancelled) return;

        if (!res.ok || !data || (data as any).ok !== true) {
          setError((data as any)?.message ?? "Link non valido o scaduto.");
          return;
        }

        const postId = (data as any).post?.id as string | undefined;
        if (!postId) {
          setError("Post non trovato.");
          return;
        }

        // Prefer post detail route if present
        try {
          router.replace(`/posts/${postId}`);
        } catch {
          router.replace("/feed");
        }
      } catch (e) {
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
