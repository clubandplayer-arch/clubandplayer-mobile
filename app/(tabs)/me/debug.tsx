import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../src/lib/supabase";
import { fetchWhoami, getWebBaseUrl, syncSession } from "../../../src/lib/api";
import { clearCrashLog, getCrashLog, type CrashLog } from "../../../src/lib/crashlog";

type CheckStatus = "ok" | "fail" | "pending";

type DebugCheck = {
  label: string;
  status: CheckStatus;
  message: string | null;
};

const initialChecks: DebugCheck[] = [
  {
    label: "posts",
    status: "pending",
    message: null,
  },
  {
    label: "post_media",
    status: "pending",
    message: null,
  },
  {
    label: "profiles",
    status: "pending",
    message: null,
  },
  {
    label: "club_verification_requests_view",
    status: "pending",
    message: null,
  },
];

export default function DebugScreen() {
  const [loading, setLoading] = useState(true);
  const [sessionPresent, setSessionPresent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checks, setChecks] = useState<DebugCheck[]>(initialChecks);
  const [webBaseUrl] = useState(() => getWebBaseUrl());
  const [syncResult, setSyncResult] = useState<string>("");
  const [whoamiResult, setWhoamiResult] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingWhoami, setIsLoadingWhoami] = useState(false);
  const [crashLog, setCrashLogState] = useState<CrashLog | null>(null);

  useEffect(() => {
    const runChecks = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const { data: userData } = await supabase.auth.getUser();

        setSessionPresent(Boolean(sessionData.session));
        setUserId(userData.user?.id ?? null);

        const results: DebugCheck[] = [];

        const postResult = await supabase
          .from("posts")
          .select("id,author_id,created_at")
          .limit(1);
        results.push({
          label: "posts",
          status: postResult.error ? "fail" : "ok",
          message: postResult.error?.message ?? null,
        });

        const postMediaResult = await supabase
          .from("post_media")
          .select("id,post_id,url,poster_url,media_type")
          .limit(1);
        results.push({
          label: "post_media",
          status: postMediaResult.error ? "fail" : "ok",
          message: postMediaResult.error?.message ?? null,
        });

        const profileResult = await supabase
          .from("profiles")
          .select(
            "id,user_id,full_name,display_name,avatar_url,account_type,type,role",
          )
          .limit(1);
        results.push({
          label: "profiles",
          status: profileResult.error ? "fail" : "ok",
          message: profileResult.error?.message ?? null,
        });

        const verificationResult = await supabase
          .from("club_verification_requests_view")
          .select("club_id,is_verified")
          .limit(1);
        results.push({
          label: "club_verification_requests_view",
          status: verificationResult.error ? "fail" : "ok",
          message: verificationResult.error?.message ?? null,
        });

        setChecks(results);
      } finally {
        setLoading(false);
      }
    };

    runChecks();
  }, []);

  useEffect(() => {
    const loadCrash = async () => {
      const latest = await getCrashLog();
      setCrashLogState(latest);
    };
    loadCrash();
  }, []);

  const handleSyncSession = async () => {
    setIsSyncing(true);
    setSyncResult("");
    try {
      const result = await syncSession();
      if (result.ok) {
        setSyncResult(
          `OK (status ${result.status})\n${JSON.stringify(
            result.data ?? null,
            null,
            2,
          )}`,
        );
      } else {
        setSyncResult(
          `ERROR (status ${result.status})\n${result.errorText ?? "Unknown error"}`,
        );
      }
    } catch (error) {
      setSyncResult(`ERROR\n${String(error)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWhoami = async () => {
    setIsLoadingWhoami(true);
    setWhoamiResult("");
    try {
      const result = await fetchWhoami();
      if (result.ok) {
        setWhoamiResult(
          `OK (status ${result.status})\n${JSON.stringify(
            result.data ?? null,
            null,
            2,
          )}`,
        );
      } else {
        setWhoamiResult(
          `ERROR (status ${result.status})\n${result.errorText ?? "Unknown error"}`,
        );
      }
    } catch (error) {
      setWhoamiResult(`ERROR\n${String(error)}`);
    } finally {
      setIsLoadingWhoami(false);
    }
  };

  const handleClearCrash = async () => {
    await clearCrashLog();
    setCrashLogState(null);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
    >
      <Text style={{ fontSize: 24, fontWeight: "800" }}>Debug Supabase</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Auth</Text>
        <Text>sessionPresent: {sessionPresent ? "true" : "false"}</Text>
        <Text>userId: {userId ?? "null"}</Text>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Query</Text>
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text>Sto controllando…</Text>
          </View>
        ) : (
          checks.map((check) => (
            <View key={check.label} style={{ gap: 4 }}>
              <Text style={{ fontWeight: "700" }}>
                {check.label}: {check.status.toUpperCase()}
              </Text>
              {check.message ? (
                <Text style={{ color: "#b91c1c" }}>Errore: {check.message}</Text>
              ) : (
                <Text style={{ color: "#6b7280" }}>Nessun errore</Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>
          WEB Session (PR1)
        </Text>
        <Text>baseUrl: {webBaseUrl}</Text>

        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <Pressable
            onPress={handleSyncSession}
            disabled={isSyncing}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: isSyncing ? "#9ca3af" : "#111827",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>
              {isSyncing ? "Syncing…" : "Sync WEB session"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleWhoami}
            disabled={isLoadingWhoami}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: isLoadingWhoami ? "#9ca3af" : "#1f2937",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>
              {isLoadingWhoami ? "Loading…" : "WEB whoami"}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <View>
            <Text style={{ fontWeight: "700" }}>Sync output</Text>
            <Text style={{ fontFamily: "Courier", color: "#111827" }}>
              {syncResult || "—"}
            </Text>
          </View>
          <View>
            <Text style={{ fontWeight: "700" }}>Whoami output</Text>
            <Text style={{ fontFamily: "Courier", color: "#111827" }}>
              {whoamiResult || "—"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>Last crash</Text>
        {crashLog ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: "#6b7280" }}>{crashLog.time}</Text>
            <Text style={{ fontWeight: "700" }}>Message</Text>
            <Text style={{ color: "#b91c1c" }}>{crashLog.message}</Text>
            <Text style={{ fontWeight: "700" }}>Stack</Text>
            <Text style={{ fontFamily: "Courier", color: "#111827" }}>
              {crashLog.stack || "—"}
            </Text>
          </View>
        ) : (
          <Text style={{ color: "#6b7280" }}>Nessun crash registrato.</Text>
        )}

        <Pressable
          onPress={handleClearCrash}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: "#111827",
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>Clear</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
