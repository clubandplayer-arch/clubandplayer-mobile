import { useCallback, useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";

import { useFonts } from "expo-font";
import { Righteous_400Regular } from "@expo-google-fonts/righteous";

import { fetchDirectMessagesUnreadCount } from "../../src/lib/api";
import { on } from "../../src/lib/events/appEvents";
import { useNotificationsBadgeCount } from "../../src/lib/notificationsBadge";
import { supabase } from "../../src/lib/supabase";
import { useIsClub } from "../../src/lib/useIsClub";

const BRAND_DARK = "#00527a";  // blu scuro logo
const BRAND_LIGHT = "#2a7aa0"; // blu chiaro logo (lo rifiniamo dopo)

export default function TabsLayout() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Righteous_400Regular,
  });

  const unreadCount = useNotificationsBadgeCount();
  const [sessionPresent, setSessionPresent] = useState(false);
  const { isClub, loading: isClubLoading } = useIsClub(sessionPresent);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);
  const pathname = usePathname();

  function isActive(route: string) {
  return pathname?.startsWith(route);
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
              fontSize: 30,       // 🔥 & più grande
              lineHeight: 30,
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
            onPress={() => router.push("/messages")}
            style={styles.iconBtn}
          >
            <Ionicons name="chatbubble-outline" size={22} color={BRAND_DARK} />
            {messagesUnreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {messagesUnreadCount > 99 ? "99+" : String(messagesUnreadCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/search")}
            style={styles.iconBtn}
          >
            <Ionicons name="search-outline" size={22} color={BRAND_DARK} />
          </TouchableOpacity>

          {/* Avatar circle: Fase 3. Placeholder spazio fisso per non shiftare layout */}
          <View style={{ width: 34 }} />
        </View>
      </View>

      {/* ICON ROW (fase 2 farà routing+active indicator) */}
      <View style={styles.iconRow}>
        {[
          { icon: "home", route: "/feed" },
          { icon: "briefcase-outline", route: "/opportunities" },
          { icon: "document-text-outline", route: "/applications" },
          { icon: "heart-outline", route: "/following" },
          { icon: "person-add-outline", route: "/search" },
          { icon: "notifications-outline", route: "/notifications" },
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
                name={item.icon as any}
                size={22}
                color={active ? BRAND_DARK : BRAND_LIGHT}
              />

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
            href: isClubLoading ? null : isClub ? undefined : null,
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
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },

  brandWrap: { minWidth: 0, flexShrink: 1, paddingRight: 12 },

  brandText: {
    fontSize: 22,
    letterSpacing: Platform.select({ ios: 0.2, android: 0.1, default: 0.2 }),
  },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
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