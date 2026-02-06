import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchWhoami } from "../../../src/lib/api";

type WhoamiProfile = {
  account_type?: string | null;
  type?: string | null;
};

function resolveAccountType(profile: unknown, role: string | null): string | null {
  if (role) return role;
  if (!profile || typeof profile !== "object") return null;
  const candidate = profile as WhoamiProfile;
  return candidate.account_type ?? candidate.type ?? null;
}

function isClubAccount(profile: unknown, role: string | null): boolean {
  const accountType = resolveAccountType(profile, role);
  return accountType === "club";
}

export default function MeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const response = await fetchWhoami();
      if (!isMounted) return;

      if (!response.ok) {
        setError(response.errorText ?? "Errore nel caricamento profilo");
        setLoading(false);
        return;
      }

      const profile = response.data?.profile ?? null;
      const role = response.data?.role ?? null;

      if (isClubAccount(profile, role)) {
        router.replace("/club/profile");
      } else {
        router.replace("/player/profile");
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>Profilo</Text>
        <Text style={{ textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}
