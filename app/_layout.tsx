import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";
import {
  getOnboardingSeen,
  subscribeOnboardingSeen,
} from "../src/lib/onboarding";

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [{ data }, seen] = await Promise.all([
        supabase.auth.getSession(),
        getOnboardingSeen(),
      ]);

      if (!isMounted) return;
      setSession(data.session ?? null);
      setOnboardingSeen(seen);
      setIsReady(true);
    };

    load();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    const unsubscribeOnboarding = subscribeOnboardingSeen((seen) => {
      setOnboardingSeen(seen);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      unsubscribeOnboarding();
    };
  }, []);

  useEffect(() => {
    if (!isReady || onboardingSeen === null) return;

    const currentGroup = segments[0];
    const inTabs = currentGroup === "(tabs)";
    const inAuth = currentGroup === "(auth)";
    const inOnboarding = currentGroup === "(onboarding)";

    let target: string | null = null;

    if (session) {
      if (!inTabs) {
        target = "/(tabs)/feed";
      }
    } else {
      target = onboardingSeen ? "/(auth)/signup" : "/(onboarding)";

      if (
        (inAuth && pathname === target) ||
        (inOnboarding && pathname === target)
      ) {
        target = null;
      }
    }

    if (target && pathname !== target && lastTargetRef.current !== target) {
      lastTargetRef.current = target;
      router.replace(target);
    }
  }, [isReady, onboardingSeen, pathname, router, segments, session]);

  if (!isReady || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  return (
    <>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
