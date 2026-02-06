import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fetchWhoami } from "../../../src/lib/api";

type WhoamiProfile = {
  account_type?: string | null;
  type?: string | null;
};

type WhoamiData = {
  user?: unknown;
  role?: string | null;
  profile?: unknown;
};

function resolveAccountType(profile: unknown, role: string | null | undefined): string | null {
  if (role) return role;
  if (!profile || typeof profile !== "object") return null;
  const candidate = profile as WhoamiProfile;
  return candidate.account_type ?? candidate.type ?? null;
}

function isClubAccount(profile: unknown, role: string | null | undefined): boolean {
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
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWhoami();
        if (!response.ok) {
          throw new Error(response.errorText ?? "Errore nel caricamento profilo");
        }

        const data = response.data as WhoamiData | undefined;
        if (!data?.user) {
          router.replace("/(auth)/login");
          return;
        }

        const profile = data.profile ?? null;
        const role = data.role ?? null;

        if (isClubAccount(profile, role)) {
          router.replace("/club/profile");
          return;
        }

        router.replace("/player/profile");
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Errore nel caricamento profilo");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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
