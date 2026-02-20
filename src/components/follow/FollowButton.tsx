import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { fetchFollowState, isUuid, toggleFollow } from "../../lib/api";
import { emit } from "../../lib/events/appEvents";

import { theme } from "../../theme";
type Props = {
  targetProfileId: string | null | undefined;
  size?: "sm" | "md";
};

export default function FollowButton({ targetProfileId, size = "md" }: Props) {
  const targetId = useMemo(() => {
    const v = String(targetProfileId ?? "").trim();
    return isUuid(v) ? v : null;
  }, [targetProfileId]);

  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
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

    const state = res.data?.state ?? {};
    setFollowing(Boolean(state[targetId]));
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = useCallback(async () => {
    if (!targetId) return;
    if (loading || toggling) return;

    setError(null);
    setToggling(true);

    const prev = following;
    setFollowing(!prev); // optimistic

    const res = await toggleFollow(targetId);
    if (!res.ok) {
      setFollowing(prev);
      setError(res.errorText ?? "Errore toggle follow");
      setToggling(false);
      return;
    }

    const nextFollowing = Boolean(res.data?.isFollowing);
    setFollowing(nextFollowing);

    await load();
    emit("follow:changed", { targetProfileId: targetId, following: nextFollowing });

    setToggling(false);
  }, [following, load, loading, targetId, toggling]);

  if (!targetId) return null;

  const padY = size === "sm" ? 8 : 10;
  const padX = size === "sm" ? 12 : 14;

  const label = following ? "Seguito" : "Segui";

  return (
    <View style={{ gap: 8 }}>
      {loading ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" />
          <Text style={{ color: theme.colors.muted }}>Carico…</Text>
        </View>
      ) : (
        <Pressable
          onPress={handleToggle}
          disabled={toggling}
          style={{
            paddingVertical: padY,
            paddingHorizontal: padX,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: following ? theme.colors.text : theme.colors.borderSubtle,
            backgroundColor: following ? theme.colors.text : "transparent",
            alignSelf: "flex-start",
            opacity: toggling ? 0.7 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          {toggling ? <ActivityIndicator size="small" /> : null}
          <Text style={{ color: following ? theme.colors.background : theme.colors.text, fontWeight: "800" }}>
            {label}
          </Text>
        </Pressable>
      )}

      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
    </View>
  );
}
