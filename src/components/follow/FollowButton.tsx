import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { fetchFollowState, isUuid, toggleFollow } from "../../lib/api";

type Props = {
  targetProfileId: string | null | undefined;
  size?: "sm" | "md";
};

export default function FollowButton({ targetProfileId, size = "md" }: Props) {
  const targetId = useMemo(() => {
    if (!targetProfileId) return null;
    const v = String(targetProfileId).trim();
    return isUuid(v) ? v : null;
  }, [targetProfileId]);

  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!targetId) {
      setLoading(false);
      setFollowing(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetchFollowState([targetId]);
    if (!res.ok) {
      setLoading(false);
      setError(res.errorText ?? "Errore follow state");
      return;
    }

    const state = (res.data?.states ?? []).find((s) => s.targetProfileId === targetId);
    setFollowing(Boolean(state?.following));
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = useCallback(async () => {
    if (!targetId) return;
    if (loading) return;

    setError(null);

    // optimistic
    const prev = following;
    setFollowing(!prev);

    const res = await toggleFollow(targetId);
    if (!res.ok) {
      // rollback
      setFollowing(prev);
      setError(res.errorText ?? "Errore toggle follow");
      return;
    }

    // trust server
    setFollowing(Boolean(res.data?.following));
  }, [following, loading, targetId]);

  if (!targetId) return null;

  const padY = size === "sm" ? 8 : 10;
  const padX = size === "sm" ? 12 : 14;

  return (
    <View style={{ gap: 8 }}>
      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: "#6b7280" }}>Carico…</Text>
        </View>
      ) : (
        <Pressable
          onPress={handleToggle}
          style={{
            paddingVertical: padY,
            paddingHorizontal: padX,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: following ? "#111827" : "#d1d5db",
            backgroundColor: following ? "#111827" : "transparent",
            alignSelf: "flex-start",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: following ? "#ffffff" : "#111827", fontWeight: "800" }}>
            {following ? "Segui già" : "Segui"}
          </Text>
        </Pressable>
      )}

      {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}
    </View>
  );
}
