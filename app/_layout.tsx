import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { CrashBoundary } from "../src/components/CrashBoundary";
import { supabase } from "../src/lib/supabase";
import { fetchProfileMe, fetchWhoami, type ProfileMe, type WhoamiResponse } from "../src/lib/api";
import {
  getAuthBootstrapState,
  getDashboardOnboardingSeen,
  getGuestOnboardingSeen,
  subscribeDashboardOnboardingSeen,
  subscribeGuestOnboardingSeen,
} from "../src/lib/authFlow";
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
  const pathname = usePathname();
  const [fontsLoaded] = useFonts({ Righteous: require("../assets/fonts/Righteous-Regular.ttf") });
  const [session, setSession] = useState<Session | null>(null);
  const [guestOnboardingSeen, setGuestOnboardingSeen] = useState<boolean | null>(null);
  const [dashboardOnboardingSeen, setDashboardOnboardingSeen] = useState<boolean>(false);
  const [whoami, setWhoami] = useState<WhoamiResponse | null>(null);
  const [profile, setProfile] = useState<ProfileMe | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const [{ data }, seen] = await Promise.all([supabase.auth.getSession(), getGuestOnboardingSeen()]);
      if (!mounted) return;
      setSession(data.session ?? null);
      setGuestOnboardingSeen(seen);
      setBootstrapped(true);
    };
    void init();
    const { data: authListener } = supabase.auth.onAuthStateChange((_evt, next) => {
      setSession(next);
      setSessionResolved(false);
      lastTargetRef.current = null;
    });
    const unsubGuest = subscribeGuestOnboardingSeen((seen) => {
      setGuestOnboardingSeen(seen);
      lastTargetRef.current = null;
    });
    const unsubDashboard = subscribeDashboardOnboardingSeen((userId, seen) => {
      if (userId === session?.user?.id) {
        setDashboardOnboardingSeen(seen);
        lastTargetRef.current = null;
      }
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      unsubGuest();
      unsubDashboard();
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadSessionState = async () => {
      if (!session?.user?.id) {
        setWhoami(null);
        setProfile(null);
        setDashboardOnboardingSeen(false);
        setSessionResolved(true);
        return;
      }
      setSessionResolved(false);
      const [whoamiResponse, profileResponse, dashboardSeen] = await Promise.all([
        fetchWhoami(),
        fetchProfileMe(),
        getDashboardOnboardingSeen(session.user.id),
      ]);
      if (cancelled) return;
      setWhoami(whoamiResponse.ok ? whoamiResponse.data ?? null : null);
      setProfile(profileResponse.ok ? profileResponse.data ?? null : null);
      setDashboardOnboardingSeen(dashboardSeen);
      setSessionResolved(true);
    };
    void loadSessionState();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const redirectTarget = useMemo(() => {
    if (!bootstrapped || guestOnboardingSeen === null || !sessionResolved) return null;
    const state = getAuthBootstrapState({ whoami, profile, dashboardOnboardingSeen });

    const isGuestWelcome = pathname === "/";
    const isAuthRoute = pathname === "/callback" || pathname === "/login" || pathname === "/signup";
    const isChooseRoleRoute = pathname === "/onboarding/choose-role";
    const isDashboardOnboardingRoute = pathname === "/onboarding";
    const isPlayerProfileRoute = pathname === "/player/profile";
    const isClubProfileRoute = pathname === "/club/profile";

    if (!session) {
      if (!guestOnboardingSeen && !isGuestWelcome) return "/(onboarding)";
      if (guestOnboardingSeen && !isAuthRoute) return "/(auth)/login";
      return null;
    }

    if (state.shouldChooseRole && !isChooseRoleRoute) return "/onboarding/choose-role";
    if (!state.shouldChooseRole && isChooseRoleRoute) {
      return state.accountType === "club" ? "/club/profile" : "/player/profile";
    }

    if (state.shouldCompleteAthleteProfile && !isPlayerProfileRoute) return "/player/profile";

    if (state.accountType === "club" && !state.shouldShowLoggedInOnboarding && isAuthRoute) return "/club/profile";
    if (state.accountType === "athlete" && !state.shouldCompleteAthleteProfile && !state.shouldShowLoggedInOnboarding && isAuthRoute) return "/(tabs)/feed";

    if (state.shouldShowLoggedInOnboarding && !isDashboardOnboardingRoute) return "/onboarding";
    if (!state.shouldShowLoggedInOnboarding && isDashboardOnboardingRoute) {
      return state.accountType === "club" ? "/club/profile" : "/(tabs)/feed";
    }

    if (state.accountType === "club" && isPlayerProfileRoute) return "/club/profile";
    if (state.accountType === "athlete" && isClubProfileRoute) return state.shouldCompleteAthleteProfile ? "/player/profile" : "/(tabs)/feed";

    return null;
  }, [bootstrapped, dashboardOnboardingSeen, guestOnboardingSeen, pathname, profile, session, sessionResolved, whoami]);

  useEffect(() => {
    if (!redirectTarget) {
      lastTargetRef.current = null;
      return;
    }
    if (lastTargetRef.current === redirectTarget) return;
    lastTargetRef.current = redirectTarget;
    router.replace(redirectTarget as any);
  }, [redirectTarget, router]);

  if (!fontsLoaded || !bootstrapped || guestOnboardingSeen === null || !sessionResolved) return <LoadingScreen />;

  return (
    <CrashBoundary>
      <Stack screenOptions={{ headerTitleStyle: { fontFamily: theme.fonts.brand, color: theme.colors.primary }, headerTintColor: theme.colors.primary, headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/choose-role" options={{ headerShown: true, title: "Scegli ruolo" }} />
        <Stack.Screen name="(dashboard)/onboarding" options={{ headerShown: true, title: "Onboarding" }} />
        <Stack.Screen name="posts/[id]" options={{ headerShown: true, title: "Post" }} />
        <Stack.Screen name="opportunities/new" options={{ headerShown: true, title: "Crea opportunità" }} />
        <Stack.Screen name="opportunities/[id]" options={{ headerShown: true, title: "Opportunità" }} />
        <Stack.Screen name="opportunities/[id]/edit" options={{ headerShown: true, title: "Modifica opportunità" }} />
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
