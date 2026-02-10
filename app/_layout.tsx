import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";
import { FollowProvider } from "../src/lib/follow/FollowProvider";
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
        lastTargetRef.current = null;
      }
    );

    const unsubscribeOnboarding = subscribeOnboardingSeen((seen) => {
      setOnboardingSeen(seen);
      lastTargetRef.current = null;
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      unsubscribeOnboarding();
    };
  }, []);

  useEffect(() => {
    if (!isReady || onboardingSeen === null) return;

    const currentGroup = segments[0]; // "(tabs)" | "(auth)" | "(onboarding)" | undefined
    const inTabs = currentGroup === "(tabs)";
    const inCallback = pathname === "/callback";

    // ✅ Allow authenticated users to visit post detail outside tabs
    const allowAuthedOutsideTabs =
      pathname?.startsWith("/posts/") || pathname === "/posts";

    let target: string | null = null;

    if (session) {
      // ✅ If user is authed and is visiting /posts/[id], do NOT redirect back to feed
      if (!inTabs && !allowAuthedOutsideTabs) target = "/(tabs)/feed";
    } else {
      if (inCallback) {
        target = null;
      } else if (!onboardingSeen) {
        target = "/(onboarding)";
      } else {
        target = "/(auth)/login";
      }
    }

    if (!target) {
      lastTargetRef.current = null;
      return;
    }

    if (lastTargetRef.current === target) return;

    if (session && inTabs) return;
    if (!session && !inCallback) {
      const inAuth = currentGroup === "(auth)";
      const inOnboarding = currentGroup === "(onboarding)";
      if (
        (target === "/(auth)/login" && inAuth) ||
        (target === "/(onboarding)" && inOnboarding)
      ) {
        return;
      }
    }

    lastTargetRef.current = target;
    router.replace(target);
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
    <FollowProvider>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />

        {/* ✅ PR4 route */}
        <Stack.Screen name="posts/[id]" />
      </Stack>
    </FollowProvider>
  );
}
