import { useCallback, useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { fetchDirectMessagesUnreadCount } from "../../src/lib/api";
import { on } from "../../src/lib/events/appEvents";
import { useNotificationsBadgeCount } from "../../src/lib/notificationsBadge";
import { supabase } from "../../src/lib/supabase";
import { useIsClub } from "../../src/lib/useIsClub";

export default function TabsLayout() {
  const unreadCount = useNotificationsBadgeCount();
  const [sessionPresent, setSessionPresent] = useState(false);
  const { isClub, loading: isClubLoading } = useIsClub(sessionPresent);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState<number>(0);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.logo}>Club & Player</Text>
        <View style={styles.headerIcons}>
          <Ionicons name="chatbubble-outline" size={24} />
          <Ionicons name="search-outline" size={24} style={{ marginLeft: 16 }} />
        </View>
      </View>

      {/* ICON ROW */}
      <View style={styles.iconRow}>
        <Ionicons name="home" size={22} color="#007AFF" />
        <Ionicons name="briefcase-outline" size={22} />
        <Ionicons name="document-text-outline" size={22} />
        <Ionicons name="heart-outline" size={22} />
        <Ionicons name="person-add-outline" size={22} />
        <Ionicons name="notifications-outline" size={22} />
        {isClub && <Ionicons name="people-outline" size={22} color="#ff2d55" />}
      </View>

      <View style={styles.divider} />

      {/* TABS CONTENT */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="feed/index" />
        <Tabs.Screen name="search/index" />
        <Tabs.Screen name="messages/index" />
        <Tabs.Screen name="club/roster" />
        <Tabs.Screen name="following" />
        <Tabs.Screen name="opportunities/index" />
        <Tabs.Screen name="create/index" options={{ href: null }} />
        <Tabs.Screen name="notifications/index" />
        <Tabs.Screen name="me/index" />
        <Tabs.Screen name="messages/[profileId]" options={{ href: null }} />
        <Tabs.Screen name="me/debug" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconRow: {
    height: 50,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
  },
});