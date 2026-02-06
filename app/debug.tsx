import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { supabase } from "../src/lib/supabase";

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
    label: "club_verification_requests (status=approved)",
    status: "pending",
    message: null,
  },
];

export default function DebugScreen() {
  const [loading, setLoading] = useState(true);
  const [sessionPresent, setSessionPresent] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checks, setChecks] = useState<DebugCheck[]>(initialChecks);

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
          .select("id,post_id,url,media_path,media_bucket,media_type")
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
          .from("club_verification_requests")
          .select("profile_id,status,payment_status,verified_until")
          .eq("status", "approved")
          .limit(1);
        results.push({
          label: "club_verification_requests (status=approved)",
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
    </ScrollView>
  );
}
