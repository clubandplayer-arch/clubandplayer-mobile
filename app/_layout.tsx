import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { AuthApiError, type Session } from "@supabase/supabase-js";
import { CrashBoundary } from "../src/components/CrashBoundary";
import { supabase } from "../src/lib/supabase";
import { getOnboardingSeen, subscribeOnboardingSeen } from "../src/lib/onboarding";
import { usePushNotificationsSync } from "../src/lib/pushNotifications";
import { normalizePushPayload, resolvePushTargetRoute } from "../src/lib/pushPayload";
import { theme } from "../src/theme";


function isInvalidRefreshTokenError(error: unknown) {
  const knownMessage = "invalid refresh token: refresh token not found";
    return error.message.toLowerCase().includes(knownMessage);
  return message.toLowerCase().includes(knownMessage);
}

function isFreshNotificationResponse(response: Notifications.NotificationResponse | null, maxAgeMs = 60_000) {
  if (!response) return false;
  const createdAt = Number(response.notification.date);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return false;
  return Date.now() - createdAt <= maxAgeMs;
    return error.message.toLowerCase().includes(knownMessage);
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes(knownMessage);
}

function isFreshNotificationResponse(response: Notifications.NotificationResponse | null, maxAgeMs = 60_000) {
  if (!response) return false;
  const createdAt = Number(response.notification.date);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return false;
  return Date.now() - createdAt <= maxAgeMs;
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  const [fontsLoaded] = useFonts({
    Righteous: require("../assets/fonts/Righteous-Regular.ttf"),
    Righteous_400Regular: require("../assets/fonts/Righteous-Regular.ttf"),
  });

  const [session, setSession] = useState<Session | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const lastTargetRef = useRef<string | null>(null);
  const lastPushRouteRef = useRef<string | null>(null);
  const pendingPushRouteRef = useRef<string | null>(null);
  usePushNotificationsSync(session?.user?.id ?? null);

  useEffect(() => {
          if (!isFreshNotificationResponse(response)) return;
    const handlePushResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      try {
        const raw = response.notification.request.content.data ?? {};
        const normalizedPayload = normalizePushPayload(raw);
        const targetRoute = resolvePushTargetRoute(normalizedPayload, "/(tabs)/notifications");
        if (!targetRoute) return;
        if (lastPushRouteRef.current === targetRoute) return;
        pendingPushRouteRef.current = targetRoute;
      } catch (error) {
        console.log("[push][tap][safe-fallback]", {
          message: error instanceof Error ? error.message : String(error ?? "unknown_error"),
        });
      }
    };

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handlePushResponse(response);
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!bootstrapped || onboardingSeen === null) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (cancelled || !response) return;
          if (!isFreshNotificationResponse(response)) return;
          try {
            const raw = response.notification.request.content.data ?? {};
            const normalizedPayload = normalizePushPayload(raw);
            const targetRoute = resolvePushTargetRoute(normalizedPayload, "/(tabs)/notifications");
            if (targetRoute) pendingPushRouteRef.current = targetRoute;
          } catch (error) {
            console.log("[push][last-response][safe-fallback]", {
              message: error instanceof Error ? error.message : String(error ?? "unknown_error"),
            });
          }
        })
        .catch((error) => {
          console.log("[push][last-response][error]", {
            message: error instanceof Error ? error.message : String(error ?? "unknown_error"),
          });
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [bootstrapped, onboardingSeen]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const [{ data }, seen] = await Promise.all([supabase.auth.getSession(), getOnboardingSeen()]);
        if (!mounted) return;
        setSession(data.session ?? null);
        setOnboardingSeen(seen);
        setBootstrapped(true);
      } catch (error) {
        if (isInvalidRefreshTokenError(error)) {
          await supabase.auth.signOut({ scope: "local" });
          const seen = await getOnboardingSeen();
          if (!mounted) return;
          setSession(null);
          setOnboardingSeen(seen);
          setBootstrapped(true);
          return;
        }
        throw error;
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_evt, next) => {
      console.log("[auth][session-changed]", {
        userId: next?.user?.id ?? null,
      });
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

  const redirectTarget = useMemo(() => {
    if (!bootstrapped || onboardingSeen === null) return null;
    if (pathname === "/") return null;

    const group = segments[0];
    const inTabs = group === "(tabs)";
    const inCallback = pathname === "/callback";

    const allowAuthedOutsideTabs =
      pathname === "/choose-role" ||
      pathname.startsWith("/mymedia") ||
      pathname.startsWith("/posts/") ||
      pathname.startsWith("/clubs/") ||
      pathname.startsWith("/players/") ||
      pathname.startsWith("/opportunities/") ||
      pathname.startsWith("/my/") ||
      pathname.startsWith("/club/") ||
      pathname.startsWith("/player/") ||
      pathname.startsWith("/fan/") ||
      pathname.startsWith("/applications") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/profile/");

    if (session) {
      if (!inTabs && !allowAuthedOutsideTabs) return "/";
      return null;
    }

    if (inCallback) return null;
    if (!onboardingSeen) return "/(onboarding)";
    return "/(auth)/login";
  }, [bootstrapped, onboardingSeen, pathname, segments, session]);

  useEffect(() => {
    if (!bootstrapped || onboardingSeen === null) return;
    if (!session) return;
    if (redirectTarget) return;
    const nextRoute = pendingPushRouteRef.current;
    if (!nextRoute) return;
    if (lastPushRouteRef.current === nextRoute) return;
    lastPushRouteRef.current = nextRoute;
    pendingPushRouteRef.current = null;
    router.push(nextRoute as any);
  }, [bootstrapped, onboardingSeen, redirectTarget, router, session]);

  useEffect(() => {
    if (!redirectTarget) {
      lastTargetRef.current = null;
      return;
    }

    if (lastTargetRef.current === redirectTarget) return;
    lastTargetRef.current = redirectTarget;
    router.replace(redirectTarget as any);
  }, [redirectTarget, router]);

  // Keep the navigator mounted even while a redirect is pending.
  // Unmounting the Stack here can prevent router.replace() from settling on some devices,
  // leaving the app on a blank loading screen.
  if (!fontsLoaded || !bootstrapped || onboardingSeen === null) {
    return <LoadingScreen />;
  }

  return (
    <CrashBoundary>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: theme.fonts.brand, color: theme.colors.primary },
          headerTintColor: theme.colors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
                <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />

        <Stack.Screen name="posts/[id]" options={{ headerShown: true, title: "Post" }} />
        <Stack.Screen name="opportunities/new" options={{ headerShown: true, title: "Crea opportunità" }} />
        <Stack.Screen name="opportunities/[id]" options={{ headerShown: true, title: "Opportunità" }} />
        <Stack.Screen name="opportunities/[id]/edit" options={{ headerShown: true, title: "Modifica opportunità" }} />
        <Stack.Screen name="clubs/[id]" options={{ headerShown: true, title: "Club" }} />
        <Stack.Screen name="players/[id]" options={{ headerShown: true, title: "Player" }} />
        <Stack.Screen name="club/profile" options={{ headerShown: true, title: "Profilo Club" }} />
        <Stack.Screen name="club/verification" options={{ headerShown: true, title: "Verifica profilo" }} />
        <Stack.Screen name="player/profile" options={{ headerShown: true, title: "Profilo" }} />
        <Stack.Screen name="fan/profile" options={{ headerShown: true, title: "Profilo Fan" }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: "Impostazioni" }} />
        <Stack.Screen name="profile/location-settings" options={{ headerShown: true, title: "Località" }} />
        <Stack.Screen name="applications/index" options={{ headerShown: false }} />
        <Stack.Screen name="my/applications" options={{ headerShown: true, title: "Le mie candidature" }} />
        <Stack.Screen name="club/applications" options={{ headerShown: true, title: "Candidature ricevute" }} />
        <Stack.Screen name="opportunities/[id]/applications" options={{ headerShown: true, title: "Candidati" }} />
      </Stack>
    </CrashBoundary>
  );
}
