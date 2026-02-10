import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { useFollow } from "../../lib/follow/FollowProvider";

type FollowButtonProps = {
  targetProfileId: string;
  currentProfileId?: string | null;
  canToggle?: boolean;
  onRequireAuth?: () => void;
};

export function FollowButton({
  targetProfileId,
  currentProfileId,
  canToggle = true,
  onRequireAuth,
}: FollowButtonProps) {
  const { ensureState, toggle, isFollowing, isPending } = useFollow();
  const targetId = String(targetProfileId ?? "").trim();
  const viewerProfileId = String(currentProfileId ?? "").trim();

  useEffect(() => {
    if (!targetId) return;
    ensureState([targetId]).catch(() => {
      // noop: il bottone resta in stato neutro finché non c'è stato valido
    });
  }, [ensureState, targetId]);

  if (!targetId) return null;
  if (viewerProfileId && viewerProfileId === targetId) return null;

  const pending = isPending(targetId);
  const following = isFollowing(targetId);
  const label = pending ? "..." : following ? "Seguo" : "Segui";

  return (
    <Pressable
      disabled={pending}
      onPress={() => {
        if (!canToggle) {
          onRequireAuth?.();
          return;
        }
        toggle(targetId).catch(() => {
          // rollback gestito nel provider
        });
      }}
      style={{
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: following ? "#0A66C2" : "#111827",
        backgroundColor: following ? "#0A66C2" : "transparent",
        opacity: pending ? 0.7 : 1,
      }}
    >
      <Text
        style={{
          fontWeight: "800",
          color: following ? "#ffffff" : "#111827",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
