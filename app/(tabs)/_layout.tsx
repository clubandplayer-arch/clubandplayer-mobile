import { useCallback, useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useNotificationsUnreadPoller } from "../../src/lib/useNotificationsUnreadPoller";

import { useFonts } from "expo-font";
import { Righteous_400Regular } from "@expo-google-fonts/righteous";

import { fetchDirectMessagesUnreadCount, clearSession, fetchProfileMe } from "../../src/lib/api";
import { on } from "../../src/lib/events/appEvents";
import { useNotificationsBadgeCount } from "../../src/lib/notificationsBadge";
import { clearAllLocallyReadNotifications } from "../../src/lib/notificationsLocalRead";
import { disablePushForCurrentDevice } from "../../src/lib/pushNotifications";
import { supabase } from "../../src/lib/supabase";
import { useIsClub } from "../../src/lib/useIsClub";
import MobileSearchOverlay from "../../src/components/search/MobileSearchOverlay";
import { isCertifiedClub } from "../../src/lib/profiles/isCertifiedClub";
import CertifiedClubCMark from "../../src/components/profiles/CertifiedClubCMark";

const BRAND_DARK = "#00527a"; // blu scuro logo
const BRAND_LIGHT = "#2a7aa0"; // blu chiaro logo (lo rifiniamo dopo)

type ProfileAvatarUpdatedPayload = {
  avatarUrl?: string | null;
};

export default function TabsLayout() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Righteous_400Regular,
  });

  const unreadCount = useNotificationsBadgeCount();
  const [sessionPresent, setSessionPresent] = useState<boolean | null>(null);
  const { isClub, loading: isClubLoading } = useIsClub(sessionPresent === true);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showCertifiedClubBadge, setShowCertifiedClubBadge] = useState(false);
  const [isFan, setIsFan] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  useNotificationsUnreadPoller();

  function isActive(route: string) {
    if (!pathname) return false;
    if (route === "/applications") return pathname.includes("/applications");
    if (route === "/discover") return pathname.startsWith("/discover");
    return pathname.startsWith(route);
  }

  function iconNameForRoute(route: string, active: boolean): keyof typeof Ionicons.glyphMap {
    if (route === "/feed") return active ? "home" : "home-outline";
    if (route === "/opportunities") return active ? "briefcase" : "briefcase-outline";
    if (route === "/applications") return active ? "document-text" : "document-text-outline";
    if (route === "/following") return active ? "people" : "people-outline";
    if (route === "/discover") return active ? "person-add" : "person-add-outline";
    if (route === "/notifications") return active ? "notifications" : "notifications-outline";
    return "ellipse-outline";
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionPresent(Boolean(data.session?.user?.id));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionPresent(Boolean(session?.user?.id));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setAvatarMenuOpen(false);
    setIsSearchOverlayOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    if (sessionPresent !== true) {
      setAvatarUrl(null);
      setIsFan(false);
      setShowCertifiedClubBadge(false);
      return;
    }

    fetchProfileMe().then((response) => {
      if (cancelled || !response.ok || !response.data) return;
      const profile = (response.data as any)?.data ?? response.data;
      const nextAvatarUrl = profile?.avatar_url ?? profile?.avatarUrl ?? null;
      const accountType = String(profile?.account_type ?? profile?.type ?? "").trim().toLowerCase();
      setAvatarUrl(typeof nextAvatarUrl === "string" && nextAvatarUrl.length > 0 ? nextAvatarUrl : null);
      setIsFan(accountType === "fan");
      setShowCertifiedClubBadge(
        isCertifiedClub({
          accountType: profile?.account_type ?? profile?.type ?? null,
          isVerified: profile?.isVerified ?? null,
          is_verified: profile?.is_verified ?? null,
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [sessionPresent]);

  const loadMessagesUnreadCount = useCallback(async () => {
    const response = await fetchDirectMessagesUnreadCount();
    if (!response.ok || !response.data) return;
    setMessagesUnreadCount(response.data.unreadThreads || 0);
  }, []);

  useEffect(() => {
    loadMessagesUnreadCount();
    const timer = setInterval(loadMessagesUnreadCount, 45000);
    const unsubscribeMessages = on("app:direct-messages-updated", loadMessagesUnreadCount);
    return () => {
      clearInterval(timer);
      unsubscribeMessages();
    };
  }, [loadMessagesUnreadCount]);

  useEffect(() => {
    const unsubscribeAvatar = on<ProfileAvatarUpdatedPayload>("app:profile-avatar-updated", (payload) => {
      const nextAvatarUrl = typeof payload?.avatarUrl === "string" ? payload.avatarUrl.trim() : "";
      setAvatarUrl(nextAvatarUrl.length > 0 ? nextAvatarUrl : null);
    });

    return () => {
      unsubscribeAvatar();
    };
  }, []);

  const closeAvatarMenu = useCallback(() => {
    setAvatarMenuOpen(false);
  }, []);

  const onAvatarPress = useCallback(() => {
    if (sessionPresent !== true) {
      router.push("/login");
      return;
    }

    setAvatarMenuOpen((prev) => !prev);
  }, [router, sessionPresent]);

  const navigateFromAvatarMenu = useCallback(
    (route: string) => {
      closeAvatarMenu();
      router.push(route as any);
    },
    [closeAvatarMenu, router]
  );

  const onLogoutFromAvatarMenu = useCallback(async () => {
    setAvatarMenuOpen(false);
    clearAllLocallyReadNotifications();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await disablePushForCurrentDevice({ userId: session?.user?.id ?? null });
    } catch {
      // no-op: logout must continue even if push disable fails
    }

    try {
      await clearSession();
    } catch {
      // no-op: replace to login must happen anyway
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // no-op: replace to login must happen anyway
    }

    router.replace("/login");
  }, [router]);

  const avatarMenuItems = [
    ...(isFan ? [] : [{ label: "La mia libreria", onPress: () => navigateFromAvatarMenu("/mymedia"), danger: false }]),
    { label: "Profilo", onPress: () => navigateFromAvatarMenu(isClub ? "/club/profile" : isFan ? "/fan/profile" : "/player/profile"), danger: false },
    ...(isClub ? [{ label: "Verifica profilo", onPress: () => navigateFromAvatarMenu("/club/verification"), danger: false }] : []),
    { label: "Impostazioni", onPress: () => navigateFromAvatarMenu("/settings"), danger: false },
    { label: "Logout", onPress: onLogoutFromAvatarMenu, danger: true },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER (mockup) */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/feed")}
          style={styles.brandWrap}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.brandText,
              fontsLoaded ? { fontFamily: "Righteous_400Regular" } : null,
            ]}
          >
            <Text style={{ color: BRAND_LIGHT }}>Club</Text>
            <Text
              style={{
                color: BRAND_DARK,
                fontSize: 36,
                lineHeight: 36,
              }}
            >
              &
            </Text>
            <Text style={{ color: BRAND_LIGHT }}>Player</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/messages")}
            style={styles.iconBtn}
          >
            <Ionicons name="chatbubble-outline" size={22} color={BRAND_DARK} />
            {messagesUnreadCount > 0 ? (
              <View style={[styles.badge, { top: 0, right: 10 }]}>
                <Text style={styles.badgeText}>
                  {messagesUnreadCount > 99 ? "99+" : String(messagesUnreadCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsSearchOverlayOpen(true)}
            style={styles.iconBtn}
          >
            <Ionicons name="search-outline" size={22} color={BRAND_DARK} />
          </TouchableOpacity>

          <View style={styles.avatarAnchor}>
            <Pressable onPress={onAvatarPress} hitSlop={10} style={styles.avatarCircle}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-outline" size={22} color={BRAND_DARK} />
              )}
              {showCertifiedClubBadge ? <CertifiedClubCMark size="sm" offsetX={-4} offsetY={-5} /> : null}
            </Pressable>

            {avatarMenuOpen ? (
              <View style={styles.avatarDropdown}>
                {avatarMenuItems.map((item, index) => {
                  const isLast = index === avatarMenuItems.length - 1;

                  return (
                    <View key={item.label}>
                      <Pressable onPress={item.onPress} style={styles.avatarMenuItem}>
                        <Text style={[styles.avatarMenuItemText, item.danger ? styles.avatarMenuItemDanger : null]}>
                          {item.label}
                        </Text>
                      </Pressable>
                      {!isLast ? <View style={styles.avatarMenuDivider} /> : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {avatarMenuOpen ? <Pressable style={styles.avatarOverlay} onPress={closeAvatarMenu} /> : null}

      <MobileSearchOverlay
        isOpen={isSearchOverlayOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={() => setIsSearchOverlayOpen(false)}
        onSubmit={() => {
          const trimmed = searchQuery.trim();
          if (!trimmed) return;
          setIsSearchOverlayOpen(false);
          router.push(`/search?q=${encodeURIComponent(trimmed)}&type=all` as any);
        }}
      />

      {/* ICON ROW (fase 2 farà routing+active indicator) */}
      <View style={styles.iconRow}>
        {[
          { route: "/feed" },
          ...(isFan ? [] : [{ route: "/opportunities" }, { route: "/applications" }]),
          { route: "/following" },
          { route: "/discover" },
          { route: "/notifications" },
        ].map((item) => {
          const active = isActive(item.route);

          return (
            <TouchableOpacity
              key={item.route}
              style={styles.iconItem}
              onPress={() => router.push(item.route)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={iconNameForRoute(item.route, active)}
                size={22}
                color={active ? BRAND_DARK : BRAND_LIGHT}
              />

              {item.route === "/notifications" && unreadCount > 0 ? (
                <View style={[styles.badge, { top: 0, right: 10 }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
                </View>
              ) : null}

              {/* Active indicator */}
              {active && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}

        {isClub && (
          <TouchableOpacity
            style={styles.iconItem}
            onPress={() => router.push("/club/roster")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people-outline"
              size={22}
              color={isActive("/club/roster") ? "#ff2d55" : "#ff9db3"}
            />
            {isActive("/club/roster") && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      {/* TABS CONTENT */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="feed/index" />
        <Tabs.Screen name="search/index" />
        <Tabs.Screen name="messages/index" />
        <Tabs.Screen
          name="club/roster"
          options={{
            href: sessionPresent === null || isClubLoading ? null : isClub ? undefined : null,
          }}
        />
        <Tabs.Screen name="following" />
        <Tabs.Screen name="opportunities/index" />
        <Tabs.Screen name="create/index" options={{ href: null }} />
        <Tabs.Screen
          name="notifications/index"
          options={{
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen name="me/index" />
        <Tabs.Screen name="messages/[profileId]" options={{ href: null }} />
        <Tabs.Screen name="me/debug" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    zIndex: 40,
  },

  brandWrap: { minWidth: 0, flexShrink: 1, paddingRight: 12 },

  brandText: {
    fontSize: 26,
    letterSpacing: Platform.select({ ios: 0.2, android: 0.1, default: 0.2 }),
  },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarAnchor: {
    position: "relative",
    zIndex: 50,
  },

  avatarCircle: {
    position: "relative",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#d7e4ea",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    overflow: "visible",
  },

  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "transparent",
  },

  avatarDropdown: {
    position: "absolute",
    top: 58,
    right: 0,
    width: 240,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 50,
  },

  avatarMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  avatarMenuItemText: {
    fontSize: 15,
    color: "#1b1b1b",
  },

  avatarMenuItemDanger: {
    color: "#d92d20",
    fontWeight: "600",
  },

  avatarMenuDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginHorizontal: 10,
  },

  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: "#ff3b30",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  iconRow: {
    height: 48,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  divider: { height: 1, backgroundColor: "#E5E5E5" },

  iconItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: 48,
  },

  activeIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: 22,
    backgroundColor: "#00527a",
    borderRadius: 2,
  },
});
