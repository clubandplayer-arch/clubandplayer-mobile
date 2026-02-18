import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { CrashBoundary } from "../src/components/CrashBoundary";
import { supabase } from "../src/lib/supabase";
import { getOnboardingSeen, subscribeOnboardingSeen } from "../src/lib/onboarding";
import { theme } from "../src/theme";

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  const [session, setSession] = useState<Session | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [{ data }, seen] = await Promise.all([
        supabase.auth.getSession(),
        getOnboardingSeen(),
      ]);
      if (!mounted) return;
      setSession(data.session ?? null);
      setOnboardingSeen(seen);
      setReady(true);
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_evt, next) => {
      setSession(next);
      lastTargetRef.current = null;
    });

    const unsubOnboarding = subscribeOnboardingSeen((seen) => {
      setOnboardingSeen(seen);
      lastTargetRef.current = null;
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      unsubOnboarding();
    };
  }, []);

  useEffect(() => {
    if (!ready || onboardingSeen === null) return;

    const group = segments[0]; // "(tabs)" | "(auth)" | "(onboarding)"
    const inTabs = group === "(tabs)";
    const inCallback = pathname === "/callback";

    // utenti loggati possono stare fuori dai tabs su queste route.
    const allowAuthedOutsideTabs =
      pathname.startsWith("/posts/") ||
      pathname.startsWith("/clubs/") ||
      pathname.startsWith("/players/") ||
      pathname.startsWith("/opportunities/") ||
      pathname.startsWith("/my/") ||
      pathname.startsWith("/club/") ||
      pathname.startsWith("/player/") ||
      pathname.startsWith("/applications");

    let target: string | null = null;

    if (session) {
      if (!inTabs && !allowAuthedOutsideTabs) target = "/(tabs)/feed";
    } else {
      if (inCallback) target = null;
      else if (!onboardingSeen) target = "/(onboarding)";
      else target = "/(auth)/login";
    }

    if (!target) {
      lastTargetRef.current = null;
      return;
    }

    if (lastTargetRef.current === target) return;
    lastTargetRef.current = target;

    router.replace(target as any);
  }, [onboardingSeen, pathname, ready, router, segments, session]);

  if (!ready || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
  Righteous: require("../assets/fonts/Righteous-Regular.ttf"),
});

  if (!fontsLoaded) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}

  return (
      <CrashBoundary>
      <AuthGate />
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: theme.fonts.brand, color: theme.colors.primary },
          headerTintColor: theme.colors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />

        <Stack.Screen name="posts/[id]" options={{ headerShown: true, title: "Post" }} />
        <Stack.Screen name="opportunities/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="clubs/[id]" options={{ headerShown: true, title: "Club" }} />
        <Stack.Screen name="players/[id]" options={{ headerShown: true, title: "Player" }} />
        <Stack.Screen name="club/profile" options={{ headerShown: true, title: "Profilo Club" }} />
        <Stack.Screen name="player/profile" options={{ headerShown: true, title: "Profilo" }} />
        <Stack.Screen name="applications/index" options={{ headerShown: false }} />
        <Stack.Screen name="my/applications" options={{ headerShown: true, title: "Le mie candidature" }} />
        <Stack.Screen name="club/applications" options={{ headerShown: true, title: "Candidature ricevute" }} />
        <Stack.Screen name="opportunities/[id]/applications" options={{ headerShown: true, title: "Candidati" }} />
      </Stack>
    </CrashBoundary>
  );
}
