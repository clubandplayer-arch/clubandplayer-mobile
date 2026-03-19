import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { CrashBoundary } from "../src/components/CrashBoundary";
import { fetchProfileMe, type ProfileMe } from "../src/lib/api";
import {
  getOnboardingSeen,
  subscribeOnboardingSeen,
} from "../src/lib/onboarding";
import { resolvePostAuthPath, RUNTIME_PATHS } from "../src/lib/postAuthRouting";
import { supabase } from "../src/lib/supabase";
import { theme } from "../src/theme";

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
  });

  const [session, setSession] = useState<Session | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<ProfileMe | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [{ data }, seen] = await Promise.all([
        supabase.auth.getSession(),
        getOnboardingSeen(),
      ]);
      if (!mounted) return;
      const nextSession = data.session ?? null;
      setSession(nextSession);
      setOnboardingSeen(seen);
      setBootstrapped(true);
      if (!nextSession) {
        setProfile(null);
        setProfileResolved(true);
        return;
      }

      const profileResponse = await fetchProfileMe();
      if (!mounted) return;
      setProfile(profileResponse.ok ? (profileResponse.data ?? null) : null);
      setProfileResolved(true);
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_evt, next) => {
        setSession(next);
        lastTargetRef.current = null;
        if (!next) {
          setProfile(null);
          setProfileResolved(true);
          return;
        }

        setProfileResolved(false);
        void fetchProfileMe().then((profileResponse) => {
          setProfile(
            profileResponse.ok ? (profileResponse.data ?? null) : null,
          );
          setProfileResolved(true);
        });
      },
    );

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

    const group = segments[0];
    const inTabs = group === "(tabs)";
    const inAuth = group === "(auth)";
    const inOnboardingGroup = group === "(onboarding)";
    const inCallback = pathname === RUNTIME_PATHS.callback;
    const isChooseRole = pathname === RUNTIME_PATHS.chooseRole;

    const allowAuthedOutsideTabs =
      pathname.startsWith("/posts/") ||
      pathname.startsWith("/clubs/") ||
      pathname.startsWith("/players/") ||
      pathname.startsWith("/opportunities/") ||
      pathname.startsWith("/my/") ||
      pathname.startsWith("/club/") ||
      pathname.startsWith("/player/") ||
      pathname.startsWith("/applications");

    if (session) {
      if (!profileResolved) return null;

      const target = resolvePostAuthPath(profile);
      const inAllowedAuthedPath =
        inTabs ||
        allowAuthedOutsideTabs ||
        pathname === target ||
        pathname === RUNTIME_PATHS.callback;

      if (target === RUNTIME_PATHS.feed) {
        if (!inAllowedAuthedPath || inAuth || inOnboardingGroup || isChooseRole)
          return target;
        return null;
      }

      if (pathname !== target) return target;
      return null;
    }

    if (inCallback) return null;
    if (!onboardingSeen && !inOnboardingGroup) return RUNTIME_PATHS.onboarding;
    if (
      onboardingSeen &&
      !inAuth &&
      pathname !== RUNTIME_PATHS.login &&
      pathname !== RUNTIME_PATHS.signup
    )
      return RUNTIME_PATHS.login;
    return null;
  }, [
    bootstrapped,
    onboardingSeen,
    pathname,
    profile,
    profileResolved,
    segments,
    session,
  ]);

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
  if (
    !fontsLoaded ||
    !bootstrapped ||
    onboardingSeen === null ||
    (session && !profileResolved)
  ) {
    return <LoadingScreen />;
  }

  return (
    <CrashBoundary>
      <Stack
        screenOptions={{
          headerTitleStyle: {
            fontFamily: theme.fonts.brand,
            color: theme.colors.primary,
          },
          headerTintColor: theme.colors.primary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />

        <Stack.Screen
          name="posts/[id]"
          options={{ headerShown: true, title: "Post" }}
        />
        <Stack.Screen
          name="opportunities/new"
          options={{ headerShown: true, title: "Crea opportunità" }}
        />
        <Stack.Screen
          name="opportunities/[id]"
          options={{ headerShown: true, title: "Opportunità" }}
        />
        <Stack.Screen
          name="opportunities/[id]/edit"
          options={{ headerShown: true, title: "Modifica opportunità" }}
        />
        <Stack.Screen
          name="clubs/[id]"
          options={{ headerShown: true, title: "Club" }}
        />
        <Stack.Screen
          name="players/[id]"
          options={{ headerShown: true, title: "Player" }}
        />
        <Stack.Screen
          name="club/profile"
          options={{ headerShown: true, title: "Profilo Club" }}
        />
        <Stack.Screen
          name="player/profile"
          options={{ headerShown: true, title: "Profilo" }}
        />
        <Stack.Screen
          name="applications/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="my/applications"
          options={{ headerShown: true, title: "Le mie candidature" }}
        />
        <Stack.Screen
          name="club/applications"
          options={{ headerShown: true, title: "Candidature ricevute" }}
        />
        <Stack.Screen
          name="opportunities/[id]/applications"
          options={{ headerShown: true, title: "Candidati" }}
        />
      </Stack>
    </CrashBoundary>
  );
}
