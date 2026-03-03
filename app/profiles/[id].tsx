import { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isUuid } from "../../src/lib/api";
import { supabase } from "../../src/lib/supabase";
import { normalizeAccountType, profileCanonicalHref } from "../../src/lib/nav/profileLinks";
import { theme } from "../../src/theme";

export default function ProfileResolverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const id = useMemo(() => {
    const raw = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
    if (!raw) return null;
    const v = String(raw).trim();
    return isUuid(v) ? v : null;
  }, [params.id]);

  useEffect(() => {
    let mounted = true;

    const resolveAndRedirect = async () => {
      if (!id) return;

      const res = await supabase
        .from("profiles")
        .select("id, account_type, type")
        .eq("id", id)
        .maybeSingle();

      if (!mounted) return;

      const accountType = normalizeAccountType(res.data?.account_type ?? res.data?.type);
      const destination = profileCanonicalHref(id, accountType ?? "player");
      router.replace(destination);
    };

    void resolveAndRedirect();

    return () => {
      mounted = false;
    };
  }, [id, router]);

  if (!id) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>Profilo non valido</Text>
        <Text style={{ color: theme.colors.muted }}>Questo percorso richiede un UUID valido.</Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.text,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>Indietro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
      <ActivityIndicator />
      <Text style={{ color: theme.colors.muted }}>Apro profilo…</Text>
    </View>
  );
}
